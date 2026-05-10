# CertPrep — Cloud Certification Practice App

## Project Overview

Build a React + Vite + TypeScript web app for practicing cloud certification exams. The app runs entirely in the browser — no backend, no runtime API calls. Question banks are static JSON files generated during the build process.

## Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **shadcn/ui** for components (Button, Card, Dialog, Progress, Tabs, Switch, AlertDialog)
- **React Router** for navigation
- **Zustand** for state management
- **lucide-react** for general icons
- **simple-icons** (npm package) for vendor logos (Azure, AWS, GCP)
- **date-fns** for timestamp formatting
- **localStorage** for all persistence

## Project Structure

```
CertificationExams/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn components
│   │   ├── ExamBadge.tsx          # Clickable vendor-logo card
│   │   ├── ExamSelector.tsx       # Welcome screen with grid of badges
│   │   ├── ModeSelector.tsx       # Exam mode vs Practice mode dialog
│   │   ├── QuestionCard.tsx       # Renders one question + options
│   │   ├── ExamRunner.tsx         # Orchestrates a session
│   │   ├── ResultsScreen.tsx      # Final score + review
│   │   ├── ReviewItem.tsx         # Per-question review with explanation
│   │   ├── HistoryView.tsx        # Past attempts list + reset options
│   │   ├── Timer.tsx              # Countdown for exam mode
│   │   ├── ThemeToggle.tsx        # Dark/light switch
│   │   └── Layout.tsx             # App shell with header
│   ├── lib/
│   │   ├── storage.ts             # localStorage CRUD wrapper
│   │   ├── questionPool.ts        # Smart randomization logic
│   │   ├── examLogic.ts           # Score calculation
│   │   └── theme.ts               # Theme provider
│   ├── data/
│   │   ├── exams.ts               # Exam metadata
│   │   └── questions/             # Generated JSON question banks
│   │       ├── az-900.json
│   │       ├── az-104.json
│   │       ├── az-305.json
│   │       ├── sc-900.json
│   │       ├── gcp-pca.json
│   │       ├── gcp-pcde.json
│   │       ├── gcp-pcd.json
│   │       ├── aws-sap.json
│   │       └── aws-dop.json
│   ├── store/
│   │   └── useExamStore.ts        # Zustand store
│   ├── types/
│   │   └── index.ts               # TS interfaces
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Type Definitions (`src/types/index.ts`)

```ts
export interface Question {
  id: string;
  question: string;
  options: string[];           // 4 options (5 for AWS multi-response)
  correctAnswers: number[];    // indices; supports multi-answer
  explanation: string;
  category: string;            // exam domain
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Exam {
  id: string;
  name: string;                // e.g., "AZ-305"
  fullName: string;            // e.g., "Azure Solutions Architect Expert"
  vendor: 'azure' | 'aws' | 'gcp';
  durationMinutes: number;
  sessionQuestionCount: number; // matches real exam
  passingScore: number;         // percentage
  iconSlug: string;             // simple-icons slug
  vendorColor: string;
}

export interface ExamSession {
  examId: string;
  mode: 'exam' | 'practice';
  questions: Question[];        // shuffled, with shuffled options
  optionMappings: Record<string, number[]>; // questionId -> original-to-shuffled index map
  answers: Record<string, number[]>;        // questionId -> selected indices (in shuffled order)
  flagged: string[];
  startedAt: number;
  completedAt?: number;
  score?: number;
  timeRemaining?: number;       // seconds, for resume
}

export interface HistoryEntry {
  id: string;                   // uuid
  examId: string;
  mode: 'exam' | 'practice';
  score: number;                // 0-100 percentage
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  passed: boolean;
  completedAt: number;
}
```

## Exam Metadata (`src/data/exams.ts`)

```ts
import type { Exam } from '@/types';

export const EXAMS: Exam[] = [
  // Microsoft Azure (40-60 questions per real exam, we use 60)
  { id: 'az-900',   name: 'AZ-900',  fullName: 'Azure Fundamentals',                vendor: 'azure', durationMinutes: 45,  sessionQuestionCount: 60, passingScore: 70, iconSlug: 'microsoftazure', vendorColor: '#0078D4' },
  { id: 'az-104',   name: 'AZ-104',  fullName: 'Azure Administrator',                vendor: 'azure', durationMinutes: 100, sessionQuestionCount: 60, passingScore: 70, iconSlug: 'microsoftazure', vendorColor: '#0078D4' },
  { id: 'az-305',   name: 'AZ-305',  fullName: 'Azure Solutions Architect Expert',   vendor: 'azure', durationMinutes: 100, sessionQuestionCount: 60, passingScore: 70, iconSlug: 'microsoftazure', vendorColor: '#0078D4' },
  { id: 'sc-900',   name: 'SC-900',  fullName: 'Security, Compliance & Identity',    vendor: 'azure', durationMinutes: 45,  sessionQuestionCount: 60, passingScore: 70, iconSlug: 'microsoftazure', vendorColor: '#0078D4' },
  // Google Cloud (50-60 per real exam, we use 60)
  { id: 'gcp-pca',  name: 'PCA',     fullName: 'GCP Professional Cloud Architect',   vendor: 'gcp',   durationMinutes: 120, sessionQuestionCount: 60, passingScore: 70, iconSlug: 'googlecloud', vendorColor: '#4285F4' },
  { id: 'gcp-pcde', name: 'PCDE',    fullName: 'GCP Professional DevOps Engineer',   vendor: 'gcp',   durationMinutes: 120, sessionQuestionCount: 60, passingScore: 70, iconSlug: 'googlecloud', vendorColor: '#4285F4' },
  { id: 'gcp-pcd',  name: 'PCD',     fullName: 'GCP Professional Cloud Developer',   vendor: 'gcp',   durationMinutes: 120, sessionQuestionCount: 60, passingScore: 70, iconSlug: 'googlecloud', vendorColor: '#4285F4' },
  // AWS Professional (75 questions per real exam)
  { id: 'aws-sap',  name: 'SAP-C02', fullName: 'AWS Solutions Architect Professional', vendor: 'aws', durationMinutes: 180, sessionQuestionCount: 75, passingScore: 75, iconSlug: 'amazonaws',  vendorColor: '#FF9900' },
  { id: 'aws-dop',  name: 'DOP-C02', fullName: 'AWS DevOps Engineer Professional',     vendor: 'aws', durationMinutes: 180, sessionQuestionCount: 75, passingScore: 75, iconSlug: 'amazonaws',  vendorColor: '#FF9900' },
];

export const POOL_SIZE_PER_EXAM = 300;
```

## Smart Randomization (`src/lib/questionPool.ts`)

```ts
import type { Question } from '@/types';

const SEEN_KEY = (examId: string) => `certprep:seen:${examId}`;

export interface PreparedSession {
  questions: Question[];
  optionMappings: Record<string, number[]>;
}

/**
 * Pulls N questions from a 300-pool, prioritizing unseen questions.
 * Once unseen pool is too small to fill a session, the seen tracker resets.
 * Also shuffles answer options per question and tracks the index mapping
 * so we can score correctly later.
 */
export function selectQuestions(
  pool: Question[],
  count: number,
  examId: string
): PreparedSession {
  const seenIds = new Set<string>(loadSeenIds(examId));
  let unseen = pool.filter(q => !seenIds.has(q.id));

  if (unseen.length < count) {
    saveSeenIds(examId, []);
    unseen = pool;
  }

  const selected = shuffle(unseen).slice(0, count);

  const newSeen = [...seenIds, ...selected.map(q => q.id)];
  saveSeenIds(examId, newSeen);

  const optionMappings: Record<string, number[]> = {};
  const preparedQuestions = selected.map(q => {
    const indices = q.options.map((_, i) => i);
    const shuffledIndices = shuffle(indices);
    optionMappings[q.id] = shuffledIndices;
    return {
      ...q,
      options: shuffledIndices.map(i => q.options[i]),
      correctAnswers: q.correctAnswers
        .map(orig => shuffledIndices.indexOf(orig))
        .sort((a, b) => a - b),
    };
  });

  return { questions: preparedQuestions, optionMappings };
}

export function loadSeenIds(examId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY(examId)) || '[]');
  } catch {
    return [];
  }
}

export function saveSeenIds(examId: string, ids: string[]) {
  localStorage.setItem(SEEN_KEY(examId), JSON.stringify(ids));
}

export function resetSeenForExam(examId: string) {
  localStorage.removeItem(SEEN_KEY(examId));
}

export function resetAllSeen() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('certprep:seen:'))
    .forEach(k => localStorage.removeItem(k));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

## Storage Wrapper (`src/lib/storage.ts`)

```ts
import type { ExamSession, HistoryEntry } from '@/types';

const KEYS = {
  HISTORY: 'certprep:history',
  CURRENT_SESSION: 'certprep:current-session',
  THEME: 'certprep:theme',
};

export const storage = {
  getHistory: (): HistoryEntry[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); }
    catch { return []; }
  },
  addHistoryEntry: (entry: HistoryEntry) => {
    const all = storage.getHistory();
    all.unshift(entry); // newest first
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(all));
  },
  resetHistory: () => localStorage.removeItem(KEYS.HISTORY),

  getCurrentSession: (): ExamSession | null => {
    try {
      const raw = localStorage.getItem(KEYS.CURRENT_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setCurrentSession: (s: ExamSession | null) => {
    if (s) localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(s));
    else localStorage.removeItem(KEYS.CURRENT_SESSION);
  },

  getTheme: () => localStorage.getItem(KEYS.THEME) || 'system',
  setTheme: (t: string) => localStorage.setItem(KEYS.THEME, t),

  resetEverything: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('certprep:') && k !== KEYS.THEME)
      .forEach(k => localStorage.removeItem(k));
  },
};
```

## User Flow

1. **Welcome screen** — Header "CertPrep — Cloud Certification Practice", subtitle "Pick an exam to begin", responsive grid of 9 ExamBadge cards (vendor logo via simple-icons, exam code, full name, "60 questions · 100 min" footer). Header has theme toggle and "History" button. If a saved in-progress session exists, show a "Resume previous session" banner above the grid.

2. **Click a badge** → Modal with two big buttons: "Exam Mode (Timed)" and "Practice Mode (No Timer)". Show duration and question count below each.

3. **Exam session** — One question per screen. Display: progress bar + "Question 12 of 60", countdown timer (exam mode only), question text, options (radio buttons for single-answer, checkboxes for multi-answer — detect from `correctAnswers.length`), flag button, Previous/Next/Submit buttons. In practice mode, "Show Answer" reveals correct answer + explanation inline before moving on. Auto-submit when timer hits zero. Save session state on every change.

4. **Results screen** — Big score % and pass/fail badge, time taken, # correct, # flagged, per-category breakdown bar chart. "Review Answers" expands collapsed list of all questions: your selection, correct selection, explanation. Filter buttons: All / Wrong only / Flagged. "Back to Home" button.

5. **History view** — Sortable table: date, exam, mode, score, pass/fail, duration. Empty state if none. Three destructive buttons each with `<AlertDialog>` confirmation:
   - **Reset History** — clears `certprep:history`
   - **Reset Question Tracker** — clears all `certprep:seen:*` keys (so the smart randomizer starts fresh)
   - **Reset Everything** — both of the above + any in-progress session (theme survives)

## Key Behaviors

- Randomize question order per session via `selectQuestions()`
- Randomize answer option order per question, track mapping for correct scoring
- Save in-progress session to `localStorage` on every answer/flag/navigation
- Multi-answer questions show checkboxes; user must select all correct answers for credit (no partial credit, matches real exams)
- Theme persists; default to `system`
- Keyboard shortcuts in exam runner: `1-5` to select option, `F` to flag, `→`/`Enter` next, `←` previous
- Fully responsive: 1 column on mobile, 2 on tablet, 3 on desktop for badge grid

## Build Order

1. Scaffold Vite + React + TS + Tailwind
2. Install shadcn/ui, configure base components
3. Set up React Router (routes: `/`, `/exam/:id`, `/results/:sessionId`, `/history`)
4. Build `Layout`, `ThemeToggle`, theme provider
5. Build `ExamSelector` + `ExamBadge` with hard-coded `EXAMS` data and `simple-icons` (use `siMicrosoftazure`, `siAmazonaws`, `siGooglecloud` from the npm package)
6. Build `ModeSelector` modal
7. **Create placeholder JSON files** at `src/data/questions/{exam-id}.json` with 5-10 sample questions each so the app is fully testable. Use this schema (see Question Bank Schema below)
8. Build `Zustand` store with session lifecycle: `startSession`, `answerQuestion`, `flagQuestion`, `nextQuestion`, `submitSession`
9. Build `ExamRunner` + `QuestionCard` + `Timer`
10. Build `ResultsScreen` + `ReviewItem` with category breakdown
11. Wire up storage persistence (current session + history)
12. Build `HistoryView` with three reset buttons + AlertDialog confirmations
13. Add resume-session banner to welcome screen
14. Polish: keyboard shortcuts, animations (framer-motion optional), empty states, mobile responsive checks
15. **Generate question banks last** — see Question Bank Generation below

## Question Bank Schema

Each file at `src/data/questions/{exam-id}.json`:

```json
{
  "examId": "az-305",
  "version": 1,
  "generatedAt": "2026-05-08",
  "questions": [
    {
      "id": "az305-identity-001",
      "question": "Your company is migrating to Azure...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswers": [2],
      "explanation": "Option C is correct because... Option A is wrong because...",
      "category": "Design identity, governance, and monitoring solutions",
      "difficulty": "medium"
    }
  ]
}
```

## Placeholder JSON for Initial Build

For the first pass, create files with this structure (10 questions each, mix of difficulties and categories) so all screens are testable end-to-end before generating the real 300-question banks. Mark these clearly with `"version": 0` and a `"placeholder": true` flag so we know to replace them.

## Question Bank Generation (Final Phase)

Each exam needs **300 questions**. Generate in batches by exam domain to keep quality high. Total: ~37 batches across 9 exams.

### Batch Plan per Exam

| Exam | Batches | Total |
|---|---|---|
| AZ-900 | Cloud concepts (80) · Architecture & services (110) · Management & governance (110) | 300 |
| AZ-104 | Identity (65) · Storage (50) · Compute (65) · Networking (80) · Monitor (40) | 300 |
| AZ-305 | Identity/governance/monitoring (80) · Data storage (70) · Business continuity (50) · Infrastructure (100) | 300 |
| SC-900 | Security/compliance/identity concepts (40) · Microsoft Entra (85) · Microsoft security (115) · Microsoft compliance (60) | 300 |
| GCP PCA | Pull domain weights from official guide, split into 4 batches | 300 |
| GCP PCDE | Pull domain weights from official guide, split into 4 batches | 300 |
| GCP PCD | Pull domain weights from official guide, split into 4 batches | 300 |
| AWS SAP | Org complexity (80) · New solutions (85) · Continuous improvement (75) · Migration (60) | 300 |
| AWS DOP | SDLC automation (65) · Config/IaC (50) · Resilience (45) · Monitoring (45) · Incident response (45) · Security (50) | 300 |

### Official Skills Outline URLs

- AZ-900: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900
- AZ-104: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104
- AZ-305: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-305
- SC-900: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-900
- GCP PCA: https://cloud.google.com/learn/certification/guides/professional-cloud-architect
- GCP PCDE: https://cloud.google.com/learn/certification/guides/cloud-devops-engineer
- GCP PCD: https://cloud.google.com/learn/certification/guides/professional-cloud-developer
- AWS SAP-C02: https://d1.awsstatic.com/training-and-certification/docs-sa-pro/AWS-Certified-Solutions-Architect-Professional_Exam-Guide.pdf
- AWS DOP-C02: https://d1.awsstatic.com/training-and-certification/docs-devops-pro/AWS-Certified-DevOps-Engineer-Professional_Exam-Guide.pdf

### Reusable Generation Prompt Template

Use this prompt for each batch (replace placeholders):

```
You are generating practice exam questions for the {EXAM_NAME} ({EXAM_CODE}) certification.

STEP 1: Web-fetch this URL for current exam objectives:
{OFFICIAL_URL}

STEP 2: Generate exactly {N} unique multiple-choice practice questions
focused specifically on the domain: "{DOMAIN_NAME}".

REQUIREMENTS:
- Match real exam difficulty and style (scenario-based, not just definitions)
- 4 options per question (5 for AWS multi-response questions if appropriate)
- Include {MULTI_COUNT} multi-answer questions (correctAnswers has 2-3 indices) — about 15% of batch
- Difficulty mix: 20% easy, 50% medium, 30% hard
- Each explanation: 2-4 sentences explaining WHY the correct answer is right AND why at least one wrong answer is wrong
- No duplicate or near-duplicate questions
- Use realistic scenarios with specific resource names, sizes, regions
- Reference current 2025-2026 services — no deprecated services (e.g., use "Microsoft Entra ID" not "Azure AD")
- Question IDs follow format: {EXAM_CODE_LOWER}-{DOMAIN_SLUG}-{NNN}

OUTPUT: Strict JSON only, no prose. Schema:
{
  "questions": [
    {
      "id": "az305-identity-001",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswers": [2],
      "explanation": "...",
      "category": "{DOMAIN_NAME}",
      "difficulty": "medium"
    }
  ]
}

After generating, save to src/data/questions/{EXAM_ID}.json — APPEND to the
existing questions array if the file already exists, don't overwrite.
```

### Generation Strategy

- **Don't generate all 2,700 upfront.** Build the app first with placeholder JSON. Then generate real banks one exam at a time, prioritizing the exam you're studying for first.
- Run batches in separate Claude Code sessions to manage rate limits.
- After each batch, spot-check 5-10 questions for accuracy before moving on.
- If a batch produces obviously bad questions (factual errors, deprecated services), regenerate that batch with more specific guidance.

## Acceptance Criteria

- [ ] All 9 exams selectable from welcome screen with vendor logos
- [ ] Both Exam and Practice modes function correctly
- [ ] Timer counts down accurately and auto-submits at zero in exam mode
- [ ] Practice mode reveals answers + explanations on demand
- [ ] Multi-answer questions require all correct selections for credit
- [ ] Smart randomization prefers unseen questions
- [ ] Session resumes correctly after page reload mid-exam
- [ ] History persists, displays sorted by date desc
- [ ] All three reset options work with confirmation dialogs
- [ ] Dark/light theme toggle persists
- [ ] Fully responsive (mobile + tablet + desktop)
- [ ] No runtime API calls — works fully offline after first load
- [ ] Keyboard shortcuts work in exam runner

## Initial Instruction to Claude Code

> Start with build order steps 1-7. Scaffold the project, set up the design system, build the welcome screen, mode selector, and create placeholder JSON files (10 questions each) for all 9 exams so the app is testable end-to-end. Stop and confirm before moving to the runner/results screens.
