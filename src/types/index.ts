export interface CaseStudy {
  /** Stable slug used as foreign key from Question.caseStudyId. */
  id: string;
  /** Display name, e.g. "Altostrat Media". */
  title: string;
  /** One-line industry descriptor, shown as subtitle/tag. */
  industry: string;
  /** Structured scenario sections — match the official PDF layout. */
  companyOverview: string;
  solutionConcept: string;
  existingTechnicalEnvironment: string;
  businessRequirements: string[];
  technicalRequirements: string[];
  executiveStatement: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  /** When present, must have length === options.length. optionExplanations[i] corresponds to options[i]. */
  optionExplanations?: string[];
  /** Optional setup/context text rendered above the option list after reveal (e.g., math derivations). */
  explanationPreamble?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** When set, the runner renders the referenced CaseStudy scenario above the question. */
  caseStudyId?: string;
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
  caseStudies?: CaseStudy[];
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
  /** Present only for exams that use case studies (currently gcp-pca). */
  caseStudies?: CaseStudy[];
}

export interface ChatMessage {
  role: 'user' | 'bot'
  content: string
}
