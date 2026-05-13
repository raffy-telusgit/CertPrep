import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Exam } from '@/types'
import { EXAMS } from '@/data/exams'
import { storage } from '@/lib/storage'
import ExamBadge from '@/components/ExamBadge'
import ModeSelector from '@/components/ModeSelector'
import { useExamStore } from '@/store/useExamStore'
import { Button } from '@/components/ui/button'
import { VENDOR_ICONS } from '@/lib/vendorIcons'

interface VendorGroup {
  vendor: Exam['vendor']
  label: string
  color: string
}

const VENDOR_GROUPS: VendorGroup[] = [
  { vendor: 'azure', label: 'Microsoft Azure', color: '#0078D4' },
  { vendor: 'gcp', label: 'Google Cloud', color: '#4285F4' },
  { vendor: 'aws', label: 'Amazon Web Services', color: '#FF9900' },
  { vendor: 'servicenow', label: 'ServiceNow', color: '#62D84E' },
]

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

      <div className="space-y-8">
        {VENDOR_GROUPS.map((group) => {
          const groupExams = EXAMS.filter((e) => e.vendor === group.vendor)
          if (groupExams.length === 0) return null
          const icon = VENDOR_ICONS[group.vendor]
          return (
            <section key={group.vendor} aria-labelledby={`vendor-${group.vendor}`}>
              <div className="flex items-center gap-3 mb-4">
                <svg
                  viewBox={icon.viewBox}
                  className="h-5 w-5 shrink-0"
                  fill={group.color}
                  aria-hidden="true"
                >
                  <path d={icon.path} />
                </svg>
                <h2
                  id={`vendor-${group.vendor}`}
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                >
                  {group.label}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupExams.map((exam) => (
                  <ExamBadge key={exam.id} exam={exam} onClick={handleBadgeClick} />
                ))}
              </div>
            </section>
          )
        })}
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
