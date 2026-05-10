import { useState } from 'react'
import { format } from 'date-fns'
import { BookOpen, Clock } from 'lucide-react'
import { storage } from '@/lib/storage'
import { resetAllSeen } from '@/lib/questionPool'
import { getExamById } from '@/data/exams'
import { formatDuration } from '@/lib/examLogic'
import type { HistoryEntry } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function HistoryView() {
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    storage.getHistory(),
  )

  function handleResetHistory() {
    storage.resetHistory()
    setHistory([])
  }

  function handleResetTracker() {
    resetAllSeen()
  }

  function handleResetEverything() {
    storage.resetEverything()
    resetAllSeen()
    setHistory([])
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">Your past exam attempts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                Reset History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset History?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all past exam attempts from
                  <code className="mx-1 rounded bg-muted px-1">certprep:history</code>.
                  Your question tracker and theme will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetHistory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                Reset Question Tracker
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Question Tracker?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all
                  <code className="mx-1 rounded bg-muted px-1">certprep:seen:*</code>
                  keys so the smart randomizer starts fresh for all exams.
                  Your history and theme will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetTracker}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset Tracker
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Reset Everything
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Everything?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete:
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>All past exam history</li>
                    <li>All seen question tracking</li>
                    <li>Any in-progress session</li>
                  </ul>
                  <p className="mt-2">
                    Your theme preference will be preserved.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetEverything}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="font-semibold text-lg">No attempts yet</p>
          <p className="text-muted-foreground">
            Pick an exam from the home page to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Exam
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Mode
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Result
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => {
                  const exam = getExamById(entry.examId)
                  return (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(entry.completedAt), 'PP p')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {exam?.name ?? entry.examId}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {exam?.fullName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {entry.mode === 'exam' ? (
                            <>
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Exam</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Practice</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {entry.correctCount}/{entry.totalQuestions}
                        <span className="text-muted-foreground font-normal ml-1">
                          ({entry.score}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={entry.passed ? 'default' : 'destructive'}
                        >
                          <span>{entry.passed ? 'PASS' : 'FAIL'}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDuration(entry.durationSeconds)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryView
