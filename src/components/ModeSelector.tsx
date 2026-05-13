import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, ArrowLeft } from 'lucide-react'
import type { Exam } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useExamStore } from '@/store/useExamStore'
import { loadQuestionBank } from '@/lib/examLogic'
import QuestionQuantityControl from '@/components/QuestionQuantityControl'

interface ModeSelectorProps {
  exam: Exam | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DialogView = 'mode-select' | 'practice-config'

interface BankState {
  examId: string
  length: number
}

function ModeSelector({ exam, open, onOpenChange }: ModeSelectorProps) {
  const navigate = useNavigate()
  const startSession = useExamStore((s) => s.startSession)

  const [view, setView] = useState<DialogView>('mode-select')
  const [loading, setLoading] = useState<'exam' | 'start-practice' | null>(null)
  const [bankState, setBankState] = useState<BankState | null>(null)
  const [bankLoading, setBankLoading] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState<number>(10)

  // Reset state when dialog opens/closes or exam changes
  useEffect(() => {
    if (!open || !exam) {
      setView('mode-select')
      setLoading(null)
      setBankError(null)
      return
    }

    // If exam changed, clear cached bank state to force reload
    if (bankState && bankState.examId !== exam.id) {
      setBankState(null)
    }
  }, [open, exam, bankState])

  async function loadBank(examId: string): Promise<number> {
    // Return cached length if available for this exam
    if (bankState && bankState.examId === examId) {
      return bankState.length
    }

    setBankLoading(true)
    setBankError(null)
    try {
      const bank = await loadQuestionBank(examId)
      const len = bank.length
      setBankState({ examId, length: len })
      const defaultCount = Math.min(10, len)
      setQuestionCount(defaultCount)
      return len
    } catch {
      setBankError('Failed to load question bank. Please try again.')
      return 0
    } finally {
      setBankLoading(false)
    }
  }

  async function handlePracticeCardClick() {
    if (!exam) return
    setView('practice-config')
    await loadBank(exam.id)
  }

  async function handleStartPractice() {
    if (!exam) return
    setLoading('start-practice')
    try {
      await startSession(exam.id, 'practice', questionCount)
      onOpenChange(false)
      navigate(`/exam/${exam.id}`)
    } finally {
      setLoading(null)
    }
  }

  async function handleStartExam() {
    if (!exam) return
    setLoading('exam')
    try {
      await startSession(exam.id, 'exam')
      onOpenChange(false)
      navigate(`/exam/${exam.id}`)
    } finally {
      setLoading(null)
    }
  }

  function handleBack() {
    setView('mode-select')
    setBankError(null)
  }

  if (!exam) return null

  const bankLength = bankState?.examId === exam.id ? bankState.length : 0
  const canStartPractice = !bankLoading && !bankError && bankLength > 0 && loading === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exam.fullName}</DialogTitle>
          {view === 'mode-select' && (
            <DialogDescription>Choose how you want to practice.</DialogDescription>
          )}
          {view === 'practice-config' && (
            <DialogDescription>Choose how many questions you want to practice.</DialogDescription>
          )}
        </DialogHeader>

        {view === 'mode-select' && (
          <>
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartExam}
                disabled={loading !== null}
                className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <Clock className="h-6 w-6 mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">Exam Mode (Timed)</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {exam.durationMinutes} min &middot; {exam.sessionQuestionCount} questions
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Simulates real exam conditions. Answers revealed after submission.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handlePracticeCardClick}
                disabled={loading !== null}
                className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <BookOpen className="h-6 w-6 mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">Practice Mode (No Timer)</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Instant feedback &middot; no timer
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reveal answers on demand and learn as you go.
                  </p>
                </div>
              </button>
            </div>

            {loading === 'exam' && (
              <p className="text-sm text-center text-muted-foreground pt-2">
                Loading questions…
              </p>
            )}

            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {view === 'practice-config' && (
          <>
            <div className="pt-2">
              {bankLoading && (
                <p className="text-sm text-muted-foreground">Loading question bank…</p>
              )}

              {bankError && (
                <p className="text-sm rounded-md bg-destructive/15 text-destructive-foreground px-3 py-2">{bankError}</p>
              )}

              {!bankLoading && !bankError && bankLength === 0 && (
                <p className="text-sm text-muted-foreground">This exam has no questions yet.</p>
              )}

              {!bankLoading && !bankError && bankLength > 0 && (
                <QuestionQuantityControl
                  value={questionCount}
                  onChange={setQuestionCount}
                  min={1}
                  max={bankLength}
                  disabled={loading === 'start-practice'}
                />
              )}
            </div>

            {loading === 'start-practice' && (
              <p className="text-sm text-center text-muted-foreground">
                Loading questions…
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleStartPractice}
                disabled={!canStartPractice}
                className="w-full"
              >
                Start Practice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={loading !== null}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ModeSelector
