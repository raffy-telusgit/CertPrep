import { useState, useId } from 'react'
import { Label } from '@/components/ui/label'

interface QuestionQuantityControlProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  disabled?: boolean
}

function QuestionQuantityControl({ value, onChange, min, max, disabled = false }: QuestionQuantityControlProps) {
  const [inputText, setInputText] = useState<string>(String(value))
  const sliderId = useId()
  const numberId = useId()

  function clamp(n: number): number {
    return Math.max(min, Math.min(max, n))
  }

  function handleRangeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value, 10)
    const clamped = clamp(parsed)
    setInputText(String(clamped))
    onChange(clamped)
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value)
  }

  function commitNumberInput() {
    const parsed = parseInt(inputText, 10)
    if (isNaN(parsed)) {
      setInputText(String(value))
    } else {
      const clamped = clamp(parsed)
      setInputText(String(clamped))
      onChange(clamped)
    }
  }

  function handleNumberKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commitNumberInput()
    }
  }

  // Keep text in sync when value changes externally (e.g., reset)
  function handleNumberFocus() {
    setInputText(String(value))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold">
        Questions: <span className="text-primary">{value}</span>
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={sliderId} className="sr-only">
          Adjust with slider
        </Label>
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={handleRangeChange}
          className="w-full h-2 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-valuetext={String(value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor={numberId} className="shrink-0">
          Type exact number
        </Label>
        <input
          id={numberId}
          type="number"
          min={min}
          max={max}
          value={inputText}
          disabled={disabled}
          onChange={handleNumberChange}
          onBlur={commitNumberInput}
          onFocus={handleNumberFocus}
          onKeyDown={handleNumberKeyDown}
          className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        1 – {max} available
      </p>
    </div>
  )
}

export default QuestionQuantityControl
