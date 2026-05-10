import type { Exam } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { VENDOR_ICONS } from '@/lib/vendorIcons'
import { cn } from '@/lib/utils'

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
      <Card
        className={cn(
          'h-full transition-colors hover:bg-accent cursor-pointer border-t-4',
        )}
        style={{ borderTopColor: exam.vendorColor }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <svg
              viewBox={icon.viewBox}
              className="h-8 w-8 shrink-0 mt-0.5"
              fill={exam.vendorColor}
              aria-hidden="true"
            >
              <path d={icon.path} />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{exam.name}</p>
              <p className="text-sm text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                {exam.fullName}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {exam.sessionQuestionCount} questions &middot; {exam.durationMinutes} min
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

export default ExamBadge
