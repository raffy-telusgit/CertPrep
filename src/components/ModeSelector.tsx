import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen } from 'lucide-react'
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

interface ModeSelectorProps {
  exam: Exam | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ModeSelector({ exam, open, onOpenChange }: ModeSelectorProps) {
  const navigate = useNavigate()
  const startSession = useExamStore((s) => s.startSession)
  const [loading, setLoading] = useState<'exam' | 'practice' | null>(null)

  async function handleSelect(mode: 'exam' | 'practice') {
    if (!exam) return
    setLoading(mode)
    try {
      await startSession(exam.id, mode)
      onOpenChange(false)
      navigate(`/exam/${exam.id}`)
    } finally {
      setLoading(null)
    }
  }

  if (!exam) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exam.fullName}</DialogTitle>
          <DialogDescription>Choose how you want to practice.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSelect('exam')}
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
            onClick={() => handleSelect('practice')}
            disabled={loading !== null}
            className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <BookOpen className="h-6 w-6 mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Practice Mode (No Timer)</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {exam.sessionQuestionCount} questions &middot; instant feedback
              </p>
              <p className="text-sm text-muted-foreground">
                Reveal answers on demand and learn as you go.
              </p>
            </div>
          </button>
        </div>

        {loading && (
          <p className="text-sm text-center text-muted-foreground pt-2">
            Loading questions…
          </p>
        )}

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModeSelector
