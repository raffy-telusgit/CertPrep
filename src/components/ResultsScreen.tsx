import { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Home, Clock, CheckCircle2, XCircle, Flag } from 'lucide-react'
import { useExamStore } from '@/store/useExamStore'
import { storage } from '@/lib/storage'
import { scoreSession, formatDuration } from '@/lib/examLogic'
import { getExamById } from '@/data/exams'
import type { ExamSession, HistoryEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ReviewItem from '@/components/ReviewItem'

function ResultsScreen() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const sessionsById = useExamStore((s) => s.sessionsById)

  const [resolved, setResolved] = useState<{
    session: ExamSession
    history: HistoryEntry
  } | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true)
      return
    }

    // Try in-memory cache first
    if (sessionsById[sessionId]) {
      setResolved(sessionsById[sessionId])
      return
    }

    // Fall back to history + no session data (can't reconstruct full session)
    const history = storage.getHistory()
    const entry = history.find((h) => h.id === sessionId)
    if (entry) {
      // We have history but no full session (e.g. after page reload)
      // We can show score summary but not detailed review
      setResolved({ session: { examId: entry.examId, mode: entry.mode, questions: [], optionMappings: {}, answers: {}, flagged: [], startedAt: entry.completedAt - entry.durationSeconds * 1000, completedAt: entry.completedAt, score: entry.score }, history: entry })
      return
    }

    setNotFound(true)
  }, [sessionId, sessionsById])

  if (notFound) {
    return <Navigate to="/" replace />
  }

  if (!resolved) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-muted-foreground">Loading results…</p>
      </div>
    )
  }

  const { session, history } = resolved
  const exam = getExamById(session.examId)
  const scoreData = session.questions.length > 0 ? scoreSession(session) : {
    score: history.score,
    correctCount: history.correctCount,
    totalQuestions: history.totalQuestions,
    byCategory: {} as Record<string, { correct: number; total: number }>,
    passed: history.passed,
  }

  const wrongQuestions = session.questions.filter((q) => {
    const sel = session.answers[q.id] ?? []
    return [...sel].sort((a, b) => a - b).join(',') !==
      [...q.correctAnswers].sort((a, b) => a - b).join(',')
  })

  const flaggedQuestions = session.questions.filter((q) =>
    session.flagged.includes(q.id),
  )

  return (
    <div className="animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero */}
        <div className="rounded-lg border bg-card p-6 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {exam?.fullName ?? session.examId}
          </h1>

          <div className="flex items-center justify-center gap-3">
            <span className="text-6xl font-bold">{scoreData.score}%</span>
            <Badge
              variant={scoreData.passed ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              <span>{scoreData.passed ? 'PASS' : 'FAIL'}</span>
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>
                {scoreData.correctCount} / {scoreData.totalQuestions} correct
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(history.durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {scoreData.passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span>Passing score: {exam?.passingScore ?? 70}%</span>
            </div>
            {session.flagged.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Flag className="h-4 w-4 text-yellow-500" />
                <span>{session.flagged.length} flagged</span>
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(scoreData.byCategory).length > 0 && (
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-lg">Category Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(scoreData.byCategory).map(([category, data]) => {
                const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate pr-4">{category}</span>
                      <span className="shrink-0 font-medium">
                        {data.correct}/{data.total} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state when session data is unavailable (e.g. after page reload) */}
        {session.questions.length === 0 && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-muted-foreground text-sm">
            Detailed review is unavailable — full session data was cleared on page reload.
          </div>
        )}

        {/* Review */}
        {session.questions.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Review Answers</h2>
            <Tabs defaultValue="all">
              <div className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="all">
                    All ({session.questions.length})
                  </TabsTrigger>
                  <TabsTrigger value="wrong">
                    Wrong ({wrongQuestions.length})
                  </TabsTrigger>
                  <TabsTrigger value="flagged">
                    Flagged ({flaggedQuestions.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="space-y-2 mt-4">
                {session.questions.map((q, i) => (
                  <ReviewItem
                    key={q.id}
                    question={q}
                    selected={session.answers[q.id] ?? []}
                    flagged={session.flagged.includes(q.id)}
                    index={i}
                  />
                ))}
              </TabsContent>

              <TabsContent value="wrong" className="space-y-2 mt-4">
                {wrongQuestions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No wrong answers. Perfect score!
                  </p>
                ) : (
                  wrongQuestions.map((q) => (
                    <ReviewItem
                      key={q.id}
                      question={q}
                      selected={session.answers[q.id] ?? []}
                      flagged={session.flagged.includes(q.id)}
                      index={session.questions.indexOf(q)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="flagged" className="space-y-2 mt-4">
                {flaggedQuestions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No flagged questions in this session.
                  </p>
                ) : (
                  flaggedQuestions.map((q) => (
                    <ReviewItem
                      key={q.id}
                      question={q}
                      selected={session.answers[q.id] ?? []}
                      flagged={true}
                      index={session.questions.indexOf(q)}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="pb-8">
          <Button onClick={() => navigate('/')} className="w-full sm:w-auto">
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ResultsScreen
