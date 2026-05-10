import type { ExamSession, Question, QuestionBankFile } from '@/types'
import { getExamById } from '@/data/exams'

export interface SessionScore {
  score: number
  correctCount: number
  totalQuestions: number
  byCategory: Record<string, { correct: number; total: number }>
  passed: boolean
}

/**
 * Multi-answer scoring: full credit only if selected set equals correct set.
 * No partial credit — matches real exam behavior.
 */
export function scoreSession(session: ExamSession): SessionScore {
  const exam = getExamById(session.examId)
  const passingScore = exam?.passingScore ?? 70

  const byCategory: Record<string, { correct: number; total: number }> = {}
  let correctCount = 0

  for (const question of session.questions) {
    const selected = session.answers[question.id] ?? []
    const correct = question.correctAnswers
    const isCorrect = arraysEqual(selected.slice().sort((a, b) => a - b), correct.slice().sort((a, b) => a - b))

    if (!byCategory[question.category]) {
      byCategory[question.category] = { correct: 0, total: 0 }
    }
    byCategory[question.category].total++

    if (isCorrect) {
      correctCount++
      byCategory[question.category].correct++
    }
  }

  const totalQuestions = session.questions.length
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const passed = score >= passingScore

  return { score, correctCount, totalQuestions, byCategory, passed }
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}h ${m}m ${s}s`
  }
  return `${m}m ${s}s`
}

export async function loadQuestionBank(examId: string): Promise<Question[]> {
  const module = (await import(`@/data/questions/${examId}.json`)) as { default: QuestionBankFile }
  return module.default.questions
}
