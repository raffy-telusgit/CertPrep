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

  const activeVendorCount = VENDOR_GROUPS.filter((g) =>
    EXAMS.some((e) => e.vendor === g.vendor),
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cloud Certification Practice
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a certification to begin your session.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
            {EXAMS.length} exams
          </span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
            {activeVendorCount} vendors
          </span>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
        {VENDOR_GROUPS.map((group) => {
          const groupExams = EXAMS.filter((e) => e.vendor === group.vendor)
          if (groupExams.length === 0) return null
          const icon = VENDOR_ICONS[group.vendor]
          return (
            <section key={group.vendor} aria-labelledby={`vendor-${group.vendor}`}>
              <div
                className="flex items-center gap-2 pb-2 mb-2 border-b"
                style={{ borderBottomColor: group.color }}
              >
                <svg
                  viewBox={icon.viewBox}
                  className="h-4 w-4 shrink-0"
                  fill={group.color}
                  aria-hidden="true"
                >
                  <path d={icon.path} />
                </svg>
                <h2
                  id={`vendor-${group.vendor}`}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {group.label}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-1">
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
