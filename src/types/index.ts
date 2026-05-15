export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Exam {
  id: string;
  name: string;
  fullName: string;
  vendor: 'azure' | 'aws' | 'gcp' | 'servicenow';
  durationMinutes: number;
  sessionQuestionCount: number;
  passingScore: number;
  iconSlug: string;
  vendorColor: string;
  disableOptionShuffle?: boolean;
}

export interface ExamSession {
  examId: string;
  mode: 'exam' | 'practice';
  questions: Question[];
  optionMappings: Record<string, number[]>;
  answers: Record<string, number[]>;
  flagged: string[];
  startedAt: number;
  completedAt?: number;
  score?: number;
  timeRemaining?: number;
}

export interface HistoryEntry {
  id: string;
  examId: string;
  mode: 'exam' | 'practice';
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  passed: boolean;
  completedAt: number;
}

export interface QuestionBankFile {
  examId: string;
  version: number;
  placeholder?: boolean;
  generatedAt: string;
  questions: Question[];
}

export interface ChatMessage {
  role: 'user' | 'bot'
  content: string
}
