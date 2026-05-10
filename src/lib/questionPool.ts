import type { Question } from '@/types'

const SEEN_KEY = (examId: string) => `certprep:seen:${examId}`

export interface PreparedSession {
  questions: Question[]
  optionMappings: Record<string, number[]>
}

/**
 * Pulls N questions from the pool, prioritizing unseen questions.
 * Once unseen pool is too small to fill a session, the seen tracker resets.
 * Shuffles answer options per question and tracks the index mapping
 * so we can score correctly later.
 */
export function selectQuestions(
  pool: Question[],
  count: number,
  examId: string,
): PreparedSession {
  // Cap count to pool size for placeholder banks (plan: risks & open questions)
  const effectiveCount = Math.min(count, pool.length)

  if (import.meta.env.DEV && pool.length < count) {
    console.warn(
      `[CertPrep] Question bank for "${examId}" has only ${pool.length} questions ` +
        `(session needs ${count}). Capping to ${effectiveCount}. ` +
        `This is expected with placeholder banks.`,
    )
  }

  const seenIds = new Set<string>(loadSeenIds(examId))
  let unseen = pool.filter((q) => !seenIds.has(q.id))

  if (unseen.length < effectiveCount) {
    saveSeenIds(examId, [])
    unseen = pool
  }

  const selected = shuffle(unseen).slice(0, effectiveCount)

  const newSeen = [...seenIds, ...selected.map((q) => q.id)]
  saveSeenIds(examId, newSeen)

  const optionMappings: Record<string, number[]> = {}
  const preparedQuestions = selected.map((q) => {
    const indices = q.options.map((_, i) => i)
    const shuffledIndices = shuffle(indices)
    optionMappings[q.id] = shuffledIndices
    return {
      ...q,
      options: shuffledIndices.map((i) => q.options[i]),
      correctAnswers: q.correctAnswers
        .map((orig) => shuffledIndices.indexOf(orig))
        .sort((a, b) => a - b),
    }
  })

  return { questions: preparedQuestions, optionMappings }
}

export function loadSeenIds(examId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY(examId)) || '[]') as string[]
  } catch {
    return []
  }
}

export function saveSeenIds(examId: string, ids: string[]): void {
  localStorage.setItem(SEEN_KEY(examId), JSON.stringify(ids))
}

export function resetSeenForExam(examId: string): void {
  localStorage.removeItem(SEEN_KEY(examId))
}

export function resetAllSeen(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('certprep:seen:'))
    .forEach((k) => localStorage.removeItem(k))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
