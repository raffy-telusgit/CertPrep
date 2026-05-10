import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useExamStore } from '@/store/useExamStore'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import QuestionCard from '@/components/QuestionCard'
import Timer from '@/components/Timer'

function ExamRunner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentSession = useExamStore((s) => s.currentSession)
  const currentQuestionIndex = useExamStore((s) => s.currentQuestionIndex)
  const answerQuestion = useExamStore((s) => s.answerQuestion)
  const toggleFlag = useExamStore((s) => s.toggleFlag)
  const goToQuestion = useExamStore((s) => s.goToQuestion)
  const submitSession = useExamStore((s) => s.submitSession)

  const [showAnswer, setShowAnswer] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)

  // Transition state for question fade/slide animation
  const [displayIdx, setDisplayIdx] = useState(currentQuestionIndex)
  const displayIdxRef = useRef(currentQuestionIndex)
  const [visible, setVisible] = useState(true)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (displayIdxRef.current === currentQuestionIndex) return
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    setVisible(false)
    transitionTimerRef.current = setTimeout(() => {
      displayIdxRef.current = currentQuestionIndex
      setDisplayIdx(currentQuestionIndex)
      setVisible(true)
    }, 120)
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [currentQuestionIndex])

  // Reset showAnswer when navigating questions; also blur active element
  useEffect(() => {
    setShowAnswer(false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }, [currentQuestionIndex])

  // Keyboard shortcuts — capture phase so we run before Radix listeners
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!currentSession) return
      const tag = (e.target as HTMLElement).tagName
      // Don't intercept typing in inputs/textareas
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const question = currentSession.questions[currentQuestionIndex]
      if (!question) return

      const total = currentSession.questions.length
      const isMulti = question.correctAnswers.length > 1
      const selected = currentSession.answers[question.id] ?? []

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5': {
          e.preventDefault()
          e.stopPropagation()
          const optionIndex = parseInt(e.key, 10) - 1
          if (optionIndex >= question.options.length) break
          if (isMulti) {
            const next = selected.includes(optionIndex)
              ? selected.filter((i) => i !== optionIndex)
              : [...selected, optionIndex]
            answerQuestion(question.id, next)
          } else {
            answerQuestion(question.id, [optionIndex])
          }
          // Blur so focus doesn't stay inside Radix radio/checkbox group
          ;(document.activeElement as HTMLElement | null)?.blur()
          break
        }
        case 'f':
        case 'F':
          e.preventDefault()
          e.stopPropagation()
          toggleFlag(question.id)
          break
        case 'ArrowRight':
          e.preventDefault()
          e.stopPropagation()
          if (currentQuestionIndex < total - 1) {
            goToQuestion(currentQuestionIndex + 1)
          } else {
            setSubmitDialogOpen(true)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          e.stopPropagation()
          goToQuestion(currentQuestionIndex - 1)
          break
        case 'Enter': {
          // Let Enter activate focused buttons naturally
          if (tag === 'BUTTON') return
          e.preventDefault()
          e.stopPropagation()
          if (currentQuestionIndex < total - 1) {
            goToQuestion(currentQuestionIndex + 1)
          } else {
            setSubmitDialogOpen(true)
          }
          break
        }
      }
    }

    // Use capture phase so we run before Radix UI's bubble-phase listeners
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [currentSession, currentQuestionIndex, answerQuestion, toggleFlag, goToQuestion])

  // If no active session and the store has nothing, redirect home
  if (!currentSession) {
    return <Navigate to="/" replace />
  }

  // Verify the session matches the route param
  if (id && currentSession.examId !== id) {
    return <Navigate to="/" replace />
  }

  const total = currentSession.questions.length
  const answeredCount = Object.keys(currentSession.answers).filter(
    (k) => currentSession.answers[k].length > 0,
  ).length

  // displayIdx-based values for QuestionCard during transition
  const displayQuestion = currentSession.questions[displayIdx]
  const displaySelected = currentSession.answers[displayQuestion?.id ?? ''] ?? []
  const displayFlagged = displayQuestion ? currentSession.flagged.includes(displayQuestion.id) : false

  function handleSubmit() {
    const sessionId = submitSession()
    navigate(`/results/${sessionId}`, { replace: true })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress bar + info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {currentQuestionIndex + 1} of {total}
          </span>
          {currentSession.mode === 'exam' && <Timer />}
        </div>
        <Progress value={((currentQuestionIndex + 1) / total) * 100} className="h-2" />
      </div>

      {/* Question card with fade + slide transition */}
      <div
        className={`transition-all duration-150 ease-out motion-safe:transition-all ${
          visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
        }`}
      >
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {displayQuestion && (
            <QuestionCard
              question={displayQuestion}
              selected={displaySelected}
              onChange={(next) => answerQuestion(displayQuestion.id, next)}
              mode={currentSession.mode}
              revealAnswer={showAnswer}
              onToggleFlag={() => toggleFlag(displayQuestion.id)}
              flagged={displayFlagged}
            />
          )}
        </div>
      </div>

      {/* Navigation footer — stacks on mobile, row on sm+ */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
          aria-label="Previous question"
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentSession.mode === 'practice' && !showAnswer && (
            <Button variant="outline" onClick={() => setShowAnswer(true)} className="w-full sm:w-auto">
              Show Answer
            </Button>
          )}

          {currentQuestionIndex < total - 1 ? (
            <Button onClick={() => goToQuestion(currentQuestionIndex + 1)} aria-label="Next question" className="w-full sm:w-auto">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button aria-label="Submit exam" className="w-full sm:w-auto">
                  <Send className="h-4 w-4" />
                  Submit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have answered {answeredCount} of {total} questions.
                    {answeredCount < total && (
                      <> {total - answeredCount} question{total - answeredCount !== 1 ? 's' : ''} unanswered.</>
                    )}
                    {' '}This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continue Reviewing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    Submit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Question navigator */}
      <div className="border rounded-lg p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Question Navigator</p>
        <div className="flex flex-wrap gap-1">
          {currentSession.questions.map((q, idx) => {
            const isAnswered = (currentSession.answers[q.id]?.length ?? 0) > 0
            const isFlagged = currentSession.flagged.includes(q.id)
            const isCurrent = idx === currentQuestionIndex
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goToQuestion(idx)}
                aria-label={`Question ${idx + 1}${isAnswered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged' : ''}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={`h-11 w-11 text-xs sm:h-8 sm:w-8 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isAnswered
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'border border-border hover:bg-accent'
                } ${isFlagged ? 'ring-2 ring-yellow-500' : ''}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-primary" /> Current
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-muted border" /> Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-border" /> Unanswered
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border-2 border-yellow-500" /> Flagged
          </span>
        </div>
      </div>
    </div>
  )
}

export default ExamRunner
