import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ExamSession, HistoryEntry } from '@/types'
import { storage } from '@/lib/storage'
import { loadQuestionBank, scoreSession } from '@/lib/examLogic'
import { selectQuestions } from '@/lib/questionPool'
import { getExamById } from '@/data/exams'

interface SessionWithHistory {
  session: ExamSession
  history: HistoryEntry
}

interface ExamStoreState {
  currentSession: ExamSession | null
  currentQuestionIndex: number
  // In-memory cache: sessionId -> entry+session, for results screen
  sessionsById: Record<string, SessionWithHistory>
  // Timer persistence tick counter
  _timerPersistCounter: number
}

interface ExamStoreActions {
  startSession: (examId: string, mode: 'exam' | 'practice', questionCount?: number) => Promise<void>
  answerQuestion: (questionId: string, selectedIndices: number[]) => void
  toggleFlag: (questionId: string) => void
  goToQuestion: (index: number) => void
  tickTimer: () => void
  submitSession: () => string
  resumeSession: () => void
  discardSession: () => void
}

type ExamStore = ExamStoreState & ExamStoreActions

export const useExamStore = create<ExamStore>((set, get) => ({
  currentSession: null,
  currentQuestionIndex: 0,
  sessionsById: {},
  _timerPersistCounter: 0,

  startSession: async (examId: string, mode: 'exam' | 'practice', questionCount?: number) => {
    const exam = getExamById(examId)
    if (!exam) throw new Error(`Unknown exam: ${examId}`)

    const bank = await loadQuestionBank(examId)
    const count = mode === 'practice' && questionCount !== undefined
      ? questionCount
      : exam.sessionQuestionCount
    const { questions, optionMappings } = selectQuestions(
      bank,
      count,
      examId,
    )

    const session: ExamSession = {
      examId,
      mode,
      questions,
      optionMappings,
      answers: {},
      flagged: [],
      startedAt: Date.now(),
      timeRemaining: mode === 'exam' ? exam.durationMinutes * 60 : undefined,
    }

    storage.setCurrentSession(session)
    set({ currentSession: session, currentQuestionIndex: 0 })
  },

  answerQuestion: (questionId: string, selectedIndices: number[]) => {
    const { currentSession } = get()
    if (!currentSession) return

    const updated: ExamSession = {
      ...currentSession,
      answers: { ...currentSession.answers, [questionId]: selectedIndices },
    }
    storage.setCurrentSession(updated)
    set({ currentSession: updated })
  },

  toggleFlag: (questionId: string) => {
    const { currentSession } = get()
    if (!currentSession) return

    const flagged = currentSession.flagged.includes(questionId)
      ? currentSession.flagged.filter((id) => id !== questionId)
      : [...currentSession.flagged, questionId]

    const updated: ExamSession = { ...currentSession, flagged }
    storage.setCurrentSession(updated)
    set({ currentSession: updated })
  },

  goToQuestion: (index: number) => {
    const { currentSession } = get()
    if (!currentSession) return

    const maxIndex = currentSession.questions.length - 1
    const bounded = Math.max(0, Math.min(index, maxIndex))
    set({ currentQuestionIndex: bounded })
  },

  tickTimer: () => {
    const { currentSession, _timerPersistCounter } = get()
    if (!currentSession || currentSession.timeRemaining === undefined) return

    const newTime = currentSession.timeRemaining - 1

    if (newTime <= 0) {
      const updated: ExamSession = { ...currentSession, timeRemaining: 0 }
      storage.setCurrentSession(updated)
      set({ currentSession: updated, _timerPersistCounter: 0 })
      // Auto-submit
      get().submitSession()
      return
    }

    // Persist every 5 seconds to avoid write storms
    const newCounter = _timerPersistCounter + 1
    const updated: ExamSession = { ...currentSession, timeRemaining: newTime }
    set({ currentSession: updated, _timerPersistCounter: newCounter })

    if (newCounter % 5 === 0) {
      storage.setCurrentSession(updated)
    }
  },

  submitSession: () => {
    const { currentSession } = get()
    if (!currentSession) return ''

    const completedAt = Date.now()
    const durationSeconds = Math.round((completedAt - currentSession.startedAt) / 1000)

    const scoreResult = scoreSession(currentSession)

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      examId: currentSession.examId,
      mode: currentSession.mode,
      score: scoreResult.score,
      correctCount: scoreResult.correctCount,
      totalQuestions: scoreResult.totalQuestions,
      durationSeconds,
      passed: scoreResult.passed,
      completedAt,
    }

    const completedSession: ExamSession = {
      ...currentSession,
      completedAt,
      score: scoreResult.score,
    }

    storage.addHistoryEntry(historyEntry)
    storage.clearCurrentSession()

    set((state) => ({
      currentSession: null,
      currentQuestionIndex: 0,
      sessionsById: {
        ...state.sessionsById,
        [historyEntry.id]: { session: completedSession, history: historyEntry },
      },
    }))

    return historyEntry.id
  },

  resumeSession: () => {
    const session = storage.getCurrentSession()
    if (session) {
      set({ currentSession: session, currentQuestionIndex: 0 })
    }
  },

  discardSession: () => {
    storage.clearCurrentSession()
    set({ currentSession: null, currentQuestionIndex: 0 })
  },
}))
