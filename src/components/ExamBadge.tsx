import type { Exam } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { VENDOR_ICONS } from '@/lib/vendorIcons'

interface ExamBadgeProps {
  exam: Exam
  onClick: (exam: Exam) => void
}

function ExamBadge({ exam, onClick }: ExamBadgeProps) {
  const icon = VENDOR_ICONS[exam.vendor]

  return (
    <button
      type="button"
      onClick={() => onClick(exam)}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      aria-label={`Select ${exam.fullName}`}
    >
      <Card className="h-full transition-colors hover:bg-accent cursor-pointer">
        <CardContent className="p-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white mb-2 w-fit"
            style={{ backgroundColor: exam.vendorColor }}
          >
            <svg
              viewBox={icon.viewBox}
              className="h-4 w-4 shrink-0"
              fill="white"
              aria-hidden="true"
            >
              <path d={icon.path} />
            </svg>
            {exam.name}
          </span>
          <p className="font-semibold text-sm leading-snug truncate">{exam.fullName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {exam.sessionQuestionCount}q &middot; {exam.durationMinutes}min
          </p>
        </CardContent>
      </Card>
    </button>
  )
}

export default ExamBadge
