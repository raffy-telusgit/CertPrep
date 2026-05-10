import { useState } from 'react'
import { ChevronDown, ChevronUp, Flag } from 'lucide-react'
import type { Question } from '@/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ReviewItemProps {
  question: Question
  selected: number[]
  flagged: boolean
  index: number
}

function ReviewItem({ question, selected, flagged, index }: ReviewItemProps) {
  const [expanded, setExpanded] = useState(false)

  const isCorrect =
    [...selected].sort((a, b) => a - b).join(',') ===
    [...question.correctAnswers].sort((a, b) => a - b).join(',')

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className={cn(
              'mt-0.5 flex-shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold',
              isCorrect
                ? 'bg-green-500 text-white'
                : 'bg-destructive text-destructive-foreground',
            )}
            aria-label={isCorrect ? 'Correct' : 'Incorrect'}
          >
            {isCorrect ? '✓' : '✗'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground mr-1">Q{index + 1}.</span>
              <span className="line-clamp-2">{question.question}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {flagged && (
            <Flag className="h-4 w-4 text-yellow-500" aria-label="Flagged" />
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-background p-4 space-y-4">
          <p className="text-base leading-relaxed">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((option, optIdx) => {
              const isCorrectOpt = question.correctAnswers.includes(optIdx)
              const isSelectedOpt = selected.includes(optIdx)
              return (
                <div
                  key={optIdx}
                  className={cn(
                    'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
                    isCorrectOpt && 'bg-green-500/10 border border-green-500/50',
                    isSelectedOpt &&
                      !isCorrectOpt &&
                      'bg-destructive/10 border border-destructive/50',
                    !isCorrectOpt && !isSelectedOpt && 'border border-transparent',
                  )}
                >
                  <span className="font-medium text-muted-foreground shrink-0 mt-0.5">
                    {optIdx + 1}.
                  </span>
                  <span className="flex-1">{option}</span>
                  <div className="shrink-0 flex items-center gap-1">
                    {isCorrectOpt && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Correct
                      </span>
                    )}
                    {isSelectedOpt && !isCorrectOpt && (
                      <span className="text-xs font-medium text-destructive">
                        Your answer
                      </span>
                    )}
                    {isSelectedOpt && isCorrectOpt && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Your answer
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Explanation</p>
            <p className="text-muted-foreground leading-relaxed">
              {question.explanation}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{question.category}</Badge>
            <Badge variant="outline" className="capitalize">
              {question.difficulty}
            </Badge>
            {flagged && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                <Flag className="h-3 w-3 mr-1" />
                Flagged
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewItem
