import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useExamStore } from '@/store/useExamStore'

function Timer() {
  const currentSession = useExamStore((s) => s.currentSession)
  const tickTimer = useExamStore((s) => s.tickTimer)

  useEffect(() => {
    if (!currentSession || currentSession.mode !== 'exam') return

    const interval = setInterval(() => {
      tickTimer()
    }, 1000)

    return () => clearInterval(interval)
  }, [currentSession, tickTimer])

  if (!currentSession || currentSession.timeRemaining === undefined) return null

  const seconds = currentSession.timeRemaining
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const timeStr =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`

  const isWarning = seconds <= 300 // last 5 minutes
  const isCritical = seconds <= 60 // last 60 seconds

  return (
    <div
      aria-live="off"
      aria-label={`Time remaining: ${timeStr}`}
      className={cn(
        'font-mono text-lg font-semibold tabular-nums',
        isWarning && 'text-destructive',
        isCritical && 'animate-pulse',
      )}
    >
      {timeStr}
    </div>
  )
}

export default Timer
