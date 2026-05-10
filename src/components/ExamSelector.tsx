import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Exam } from '@/types'
import { EXAMS } from '@/data/exams'
import { storage } from '@/lib/storage'
import ExamBadge from '@/components/ExamBadge'
import ModeSelector from '@/components/ModeSelector'
import { useExamStore } from '@/store/useExamStore'
import { Button } from '@/components/ui/button'

function ExamSelector() {
  const navigate = useNavigate()
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const resumeSession = useExamStore((s) => s.resumeSession)
  const discardSession = useExamStore((s) => s.discardSession)

  const [savedSession, setSavedSession] = useState(() => storage.getCurrentSession())
  const savedExam = savedSession
    ? EXAMS.find((e) => e.id === savedSession.examId)
    : null

  function handleBadgeClick(exam: Exam) {
    setSelectedExam(exam)
    setDialogOpen(true)
  }

  function handleResume() {
    resumeSession()
    if (savedSession) {
      navigate(`/exam/${savedSession.examId}`)
    }
  }

  function handleDiscard() {
    discardSession()
    setSavedSession(null)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Cloud Certification Practice
        </h1>
        <p className="text-muted-foreground text-lg">
          Pick an exam to begin. Smart randomization ensures you see fresh questions every session.
        </p>
      </div>

      {savedSession && savedExam && (
        <div data-testid="resume-banner" className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Resume previous session</p>
              <p className="text-sm text-muted-foreground">
                {savedExam.name} &mdash; {savedExam.fullName} &middot;{' '}
                {savedSession.mode === 'exam' ? 'Exam mode' : 'Practice mode'}
                {savedSession.mode === 'exam' && savedSession.timeRemaining !== undefined && (
                  <> &middot; {Math.ceil(savedSession.timeRemaining / 60)} min remaining</>
                )}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={handleResume}>
                Resume
              </Button>
              <Button size="sm" variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMS.map((exam) => (
          <ExamBadge key={exam.id} exam={exam} onClick={handleBadgeClick} />
        ))}
      </div>

      <ModeSelector
        exam={selectedExam}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}

export default ExamSelector
