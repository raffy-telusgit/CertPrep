import type { ExamSession, HistoryEntry } from '@/types'

export const KEYS = {
  HISTORY: 'certprep:history',
  CURRENT_SESSION: 'certprep:current-session',
  THEME: 'certprep:theme',
} as const

export const storage = {
  getHistory: (): HistoryEntry[] => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]') as HistoryEntry[]
    } catch {
      return []
    }
  },

  addHistoryEntry: (entry: HistoryEntry): void => {
    const all = storage.getHistory()
    all.unshift(entry) // newest first
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(all))
  },

  resetHistory: (): void => {
    localStorage.removeItem(KEYS.HISTORY)
  },

  getCurrentSession: (): ExamSession | null => {
    try {
      const raw = localStorage.getItem(KEYS.CURRENT_SESSION)
      return raw ? (JSON.parse(raw) as ExamSession) : null
    } catch {
      return null
    }
  },

  setCurrentSession: (s: ExamSession | null): void => {
    if (s) {
      localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(s))
    } else {
      localStorage.removeItem(KEYS.CURRENT_SESSION)
    }
  },

  clearCurrentSession: (): void => {
    localStorage.removeItem(KEYS.CURRENT_SESSION)
  },

  getTheme: (): string => {
    return localStorage.getItem(KEYS.THEME) || 'system'
  },

  setTheme: (t: string): void => {
    localStorage.setItem(KEYS.THEME, t)
  },

  resetEverything: (): void => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('certprep:') && k !== KEYS.THEME)
      .forEach((k) => localStorage.removeItem(k))
  },
}
