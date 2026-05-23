import type { CaseStudy, Question } from '@/types'

const SEEN_KEY = (examId: string) => `certprep:seen:${examId}`

export interface PreparedSession {
  questions: Question[]
  optionMappings: Record<string, number[]>
}

/**
 * Pulls N questions from the pool, prioritizing unseen questions.
 * Once unseen pool is too small to fill a session, the seen tracker resets.
 * Question order is randomized; option order within each question is fixed
 * so that A/B/C/D labels in explanations remain accurate.
 *
 * When the bank has case studies, forces inclusion of 2 random case studies
 * with 4–6 questions each. Same-caseStudyId questions are clustered contiguously.
 */
export function selectQuestions(
  pool: Question[],
  count: number,
  examId: string,
  caseStudies: CaseStudy[] = [],
): PreparedSession {
  // Cap count to pool size for placeholder banks
  const effectiveCount = Math.min(count, pool.length)

  if (import.meta.env.DEV && pool.length < count) {
    console.warn(
      `[CertPrep] Question bank for "${examId}" has only ${pool.length} questions ` +
        `(session needs ${count}). Capping to ${effectiveCount}. ` +
        `This is expected with placeholder banks.`,
    )
  }

  // --- Case-study forced inclusion ---
  if (caseStudies.length > 0) {
    return selectWithCaseStudies(pool, effectiveCount, examId)
  }

  // --- Standard path (no case studies) ---
  const seenIds = new Set<string>(loadSeenIds(examId))
  let unseen = pool.filter((q) => !seenIds.has(q.id))

  if (unseen.length < effectiveCount) {
    saveSeenIds(examId, [])
    unseen = pool
  }

  const selected = shuffle(unseen).slice(0, effectiveCount)

  const newSeen = [...seenIds, ...selected.map((q) => q.id)]
  saveSeenIds(examId, newSeen)

  return { questions: selected, optionMappings: {} }
}

/**
 * Selection logic for banks with case studies.
 * Picks 2 random case studies, takes 4–6 questions from each,
 * fills the remainder from non-case-study pool (using seen-tracking),
 * then clusters same-caseStudyId questions contiguously.
 */
function selectWithCaseStudies(
  pool: Question[],
  count: number,
  examId: string,
): PreparedSession {
  // Separate case-study questions from regular questions
  const csQuestions: Map<string, Question[]> = new Map()
  const regularQuestions: Question[] = []

  for (const q of pool) {
    if (q.caseStudyId) {
      const existing = csQuestions.get(q.caseStudyId) ?? []
      existing.push(q)
      csQuestions.set(q.caseStudyId, existing)
    } else {
      regularQuestions.push(q)
    }
  }

  // Pick 2 case studies at random from those with questions in the pool
  const availableCaseStudyIds = [...csQuestions.keys()]
  const pickedCsIds = shuffle(availableCaseStudyIds).slice(0, Math.min(2, availableCaseStudyIds.length))

  // Pick 4–6 questions per selected case study
  const csSelected: Question[] = []
  for (const csId of pickedCsIds) {
    const csPool = csQuestions.get(csId) ?? []
    const perCsCount = Math.min(csPool.length, 4 + Math.floor(Math.random() * 3)) // 4, 5, or 6
    csSelected.push(...shuffle(csPool).slice(0, perCsCount))
  }

  // Fill the rest from the non-case-study pool using seen-tracking
  const remainingSlots = Math.max(0, count - csSelected.length)

  const seenIds = new Set<string>(loadSeenIds(examId))
  let unseenRegular = regularQuestions.filter((q) => !seenIds.has(q.id))

  if (unseenRegular.length < remainingSlots) {
    // Reseed: clear only regular-question seen IDs and use full regular pool
    saveSeenIds(examId, [])
    unseenRegular = regularQuestions
  }

  const regularSelected = shuffle(unseenRegular).slice(0, remainingSlots)

  // Update seen tracker with the regular questions selected
  const newSeen = [...seenIds, ...regularSelected.map((q) => q.id)]
  saveSeenIds(examId, newSeen)

  // Cluster: group case-study questions contiguously, interleave regular questions
  const clustered = clusterByCaseStudyId(regularSelected, csSelected, pickedCsIds)

  return { questions: clustered, optionMappings: {} }
}

/**
 * Returns a list where:
 * - Non-case-study questions maintain their relative shuffle order.
 * - Case-study questions are injected as contiguous groups, in pickedCsIds order.
 *   Groups are inserted at their natural first-appearance position among the shuffled regular pool,
 *   but since we want deterministic clustering the simplest correct approach is to
 *   prepend all case-study clusters then append regular questions.
 *   The real exam structure has case studies as a dedicated section, so leading clusters are faithful.
 */
function clusterByCaseStudyId(
  regular: Question[],
  caseStudyQs: Question[],
  orderedCsIds: string[],
): Question[] {
  const grouped: Map<string, Question[]> = new Map()
  for (const csId of orderedCsIds) {
    grouped.set(csId, [])
  }
  for (const q of caseStudyQs) {
    if (q.caseStudyId && grouped.has(q.caseStudyId)) {
      grouped.get(q.caseStudyId)!.push(q)
    }
  }

  const result: Question[] = []
  for (const csId of orderedCsIds) {
    result.push(...(grouped.get(csId) ?? []))
  }
  result.push(...regular)

  return result
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
