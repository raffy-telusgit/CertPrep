import { CheckCircle2, Flag, XCircle } from 'lucide-react'
import type { Question } from '@/types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface QuestionCardProps {
  question: Question
  selected: number[]
  onChange: (next: number[]) => void
  mode: 'exam' | 'practice'
  revealAnswer: boolean
  onToggleFlag: () => void
  flagged: boolean
}

function QuestionCard({
  question,
  selected,
  onChange,
  mode,
  revealAnswer,
  onToggleFlag,
  flagged,
}: QuestionCardProps) {
  const isMulti = question.correctAnswers.length > 1

  function handleSingleChange(val: string) {
    onChange([parseInt(val, 10)])
  }

  function handleMultiChange(index: number, checked: boolean) {
    if (checked) {
      onChange([...selected, index])
    } else {
      onChange(selected.filter((i) => i !== index))
    }
  }

  function getOptionState(index: number): 'correct' | 'wrong' | 'neutral' {
    if (!revealAnswer) return 'neutral'
    const isCorrect = question.correctAnswers.includes(index)
    const isSelected = selected.includes(index)
    if (isCorrect) return 'correct'
    if (isSelected && !isCorrect) return 'wrong'
    return 'neutral'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-lg leading-relaxed font-medium flex-1">
          {question.question}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFlag}
          aria-label={flagged ? 'Remove flag' : 'Flag this question'}
          className={cn('h-11 w-11', flagged && 'text-yellow-500')}
        >
          <Flag className="h-4 w-4" />
        </Button>
      </div>

      {isMulti && (
        <p className="text-sm text-muted-foreground font-medium">
          Select all that apply ({question.correctAnswers.length} correct answers)
        </p>
      )}

      {isMulti ? (
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const state = getOptionState(index)
            const id = `option-${question.id}-${index}`
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center space-x-3 rounded-lg border p-3 transition-colors',
                  revealAnswer && state === 'correct' && 'border-green-500 bg-green-500/10',
                  revealAnswer && state === 'wrong' && 'border-destructive bg-destructive/10',
                  !revealAnswer && selected.includes(index) && 'border-primary bg-primary/10',
                )}
              >
                <Checkbox
                  id={id}
                  checked={selected.includes(index)}
                  onCheckedChange={(checked) =>
                    handleMultiChange(index, checked === true)
                  }
                  disabled={revealAnswer}
                  aria-label={`Option ${index + 1}: ${option}`}
                />
                <Label
                  htmlFor={id}
                  className="flex-1 cursor-pointer text-base leading-relaxed"
                >
                  {option}
                </Label>
                {revealAnswer && state === 'correct' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400" aria-label="Correct answer">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Correct
                  </span>
                )}
                {revealAnswer && state === 'wrong' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive dark:text-red-300" aria-label="Wrong answer">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Wrong
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <RadioGroup
          value={selected.length > 0 ? String(selected[0]) : ''}
          onValueChange={handleSingleChange}
          className="space-y-3"
        >
          {question.options.map((option, index) => {
            const state = getOptionState(index)
            const id = `option-${question.id}-${index}`
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center space-x-3 rounded-lg border p-3 transition-colors',
                  revealAnswer && state === 'correct' && 'border-green-500 bg-green-500/10',
                  revealAnswer && state === 'wrong' && 'border-destructive bg-destructive/10',
                  !revealAnswer && selected.includes(index) && 'border-primary bg-primary/10',
                )}
              >
                <RadioGroupItem
                  value={String(index)}
                  id={id}
                  disabled={revealAnswer}
                  aria-label={`Option ${index + 1}: ${option}`}
                />
                <Label
                  htmlFor={id}
                  className="flex-1 cursor-pointer text-base leading-relaxed"
                >
                  {option}
                </Label>
                {revealAnswer && state === 'correct' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400" aria-label="Correct answer">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Correct
                  </span>
                )}
                {revealAnswer && state === 'wrong' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive dark:text-red-300" aria-label="Wrong answer">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Wrong
                  </span>
                )}
              </div>
            )
          })}
        </RadioGroup>
      )}

      {revealAnswer && mode === 'practice' && (
        <Alert>
          <AlertTitle>Explanation</AlertTitle>
          <AlertDescription>{question.explanation}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">{question.category}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{question.difficulty}</span>
      </div>
    </div>
  )
}

export default QuestionCard
