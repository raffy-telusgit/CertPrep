# GCP PCA Question Bank + Case Study Support — Architect Spec

**Produced:** 2026-05-22 (architect Phase 4 output, recovered /featuredev session)
**Status:** Approved — all open questions resolved (see §8)
**Downstream agents:** designer (Phase 4.5, UI spec for CaseStudyPanel), coder (Phase 5)

## Decisions locked (2026-05-22)

- **Q1:** Force 2-of-4 case studies per PCA session (architect's recommendation accepted). `selectQuestions` will pick 2 case studies at random, pull 4–6 questions from each, and fill the rest from the non-CS pool.
- **Q2:** Author `.claude/pca-case-studies.json` as the canonical source the merge script reads (architect's recommendation accepted).
- **Q3:** Reproduce Google's case-study scenario text verbatim (architect's recommendation accepted). Source captured in `.claude/pca-case-studies.md`.

---

## 1. Schema changes — `src/types/index.ts`

### New `CaseStudy` interface

```ts
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
```

**Decision: structured fields, not a single markdown blob.** Rationale:
- The four case studies share identical section headers. Structured fields let the renderer use semantic `<section>` + `<h3>` per section — better for a11y and screen-reader navigation than parsed markdown.
- Avoids pulling in a markdown parser (no new dep — CLAUDE.md requires approval to add one).
- Bulleted requirements are arrays so the UI renders proper `<ul>`, matching the source PDFs.

### `Question` — add optional `caseStudyId`

```ts
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  optionExplanations?: string[];
  explanationPreamble?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** When set, the runner renders the referenced CaseStudy scenario above the question. */
  caseStudyId?: string;
}
```

Optional. Existing banks remain valid.

### `QuestionBankFile` — add optional `caseStudies`

```ts
export interface QuestionBankFile {
  examId: string;
  version: number;
  placeholder?: boolean;
  generatedAt: string;
  questions: Question[];
  /** Present only for exams that use case studies (currently gcp-pca). */
  caseStudies?: CaseStudy[];
}
```

### Validation rule (enforced by the merge script, not by TS)

For each question where `caseStudyId` is set, `caseStudies` MUST contain an entry whose `id` matches. Merge script throws on violation.

---

## 2. Data flow — JSON → store → runner

### Load path

`src/lib/examLogic.ts` currently has:

```ts
export async function loadQuestionBank(examId: string): Promise<Question[]> {
  const module = (await import(`@/data/questions/${examId}.json`)) as { default: QuestionBankFile }
  return module.default.questions
}
```

Change the return shape so case studies travel alongside questions:

```ts
export interface LoadedBank {
  questions: Question[]
  caseStudies: CaseStudy[]
}
export async function loadQuestionBank(examId: string): Promise<LoadedBank>
```

Callers: only `src/store/useExamStore.ts` (`startSession`) — update to destructure and pass to `selectQuestions` and to persist case studies into the session.

### Persist case studies into the session

`ExamSession` needs the case studies for the active session so the runner can render them and resume after reload (localStorage). Add an optional field:

```ts
export interface ExamSession {
  // ...existing...
  caseStudies?: CaseStudy[]
}
```

### Rendering — `ExamRunner` + new `CaseStudyPanel`

When `displayQuestion.caseStudyId` is set:
1. Look up the case study by id in `currentSession.caseStudies`.
2. Render a `<CaseStudyPanel>` ABOVE the existing question card, inside the same `max-w-4xl` column.

**Clustering vs pinning — recommendation: do both.** Pin the scenario to the top of every page when the current question has a `caseStudyId`, AND order session questions so that questions sharing a `caseStudyId` are contiguous.

Reasoning:
- The real PCA exam presents the case study as a separate tab/panel that stays visible — pinning matches that mental model.
- Clustering means once a user reads the scenario for "EHR Healthcare," they answer all EHR questions before the scenario changes, minimizing context-switch cost.
- Pinning alone (without clustering) forces re-reading; pinning + clustering is best.

**Clustering rule (implemented in `selectQuestions`):**
After the existing random shuffle and slice to N, re-sort the selected slice so that questions with the same `caseStudyId` are adjacent:
1. Partition selected into `withCS` (has `caseStudyId`) and `withoutCS`.
2. Group `withCS` by `caseStudyId` — order of groups is the order the first member appears.
3. Build the final list by walking the original selected order; when encountering the first member of a CS group, emit the entire group; on subsequent members of an already-emitted group, skip (they've been emitted).

**Collapsibility:** Panel is **collapsible** and **collapsed by default after the first question in a cluster**. On the first question of a new case study (i.e., the previous displayed question had a different or no `caseStudyId`), it auto-expands. Within the same cluster, it remembers user state (local React state — no persistence needed).

Designer fills in visual treatment (heights, scroll behavior, sticky positioning on desktop, modal/sheet on mobile).

---

## 3. Component changes

### New components

| File | Purpose | Designer review |
|---|---|---|
| `src/components/CaseStudyPanel.tsx` | Renders a `CaseStudy` with title, industry tag, and the six sections. Collapsible (controlled `expanded` prop + `onToggle`). Two arrays render as `<ul>`. Long scrollable region; sticky-on-desktop is a designer call. | REQUIRES DESIGNER REVIEW |

### Modified components

| File | Why | Designer review |
|---|---|---|
| `src/components/ExamRunner.tsx` | When `displayQuestion.caseStudyId` is set, look up case study from `currentSession.caseStudies` and render `<CaseStudyPanel>` above the question card. Track `expanded` state per case-study id in local `useState` so toggling persists across questions within a cluster. Auto-expand on first question of a new cluster. | REQUIRES DESIGNER REVIEW |
| `src/components/ReviewItem.tsx` | In the results review screen, when a reviewed question has `caseStudyId`, surface the case-study title as a small badge near the existing category/difficulty badges so users know which scenario the question belonged to. Do NOT re-render the full scenario inline. | REQUIRES DESIGNER REVIEW |

### Components NOT changing

- `QuestionCard.tsx` — no change. It only renders the question + options.
- `ResultsScreen.tsx`, `HistoryView.tsx`, `ExamBadge.tsx`, `ExamSelector.tsx` — no change.
- `ModeSelector.tsx` — no change.

---

## 4. Store and pool changes

### `src/store/useExamStore.ts`
- `startSession`:
  - Update `loadQuestionBank` call to new return shape.
  - Pass `caseStudies` into the new `ExamSession.caseStudies` field.
  - No other changes.

### `src/lib/questionPool.ts`
- `selectQuestions` gains a final "cluster by caseStudyId" pass after the random shuffle + slice. Pure function on the selected array — no behavior change for banks without `caseStudyId`.
- `disableOptionShuffle` is currently unused in `selectQuestions` (option order is already fixed). Setting the flag on PCA is forward-compat only; no code change needed in `questionPool.ts`.

### `src/lib/examLogic.ts`
- `loadQuestionBank` updated to return `LoadedBank` including `caseStudies` (default to `[]` when absent).

### `src/lib/storage.ts`
- No change. The session is already JSON-serialized; new `caseStudies` field rides along automatically.

---

## 5. Exam metadata — `src/data/exams.ts`

The PCA entry already exists. Modify it to add `disableOptionShuffle: true`:

```ts
{
  id: 'gcp-pca',
  name: 'PCA',
  fullName: 'GCP Professional Cloud Architect',
  vendor: 'gcp',
  durationMinutes: 120,
  sessionQuestionCount: 60,
  passingScore: 70,
  iconSlug: 'googlecloud',
  vendorColor: '#4285F4',
  disableOptionShuffle: true,
},
```

**Justification:**
- Official guide: 2 hours, 50–60 questions. `durationMinutes: 120` and `sessionQuestionCount: 60` match upper bound.
- `passingScore: 70` retained — Google does not publish exact passing %; 70 is the project-wide default.
- `disableOptionShuffle: true` matches gcp-pcde and sc-900, both of which embed "Option A/B/C/D" labels in their `optionExplanations`. PCA will follow the same convention.

---

## 6. Question generation plan

### Batch sizes (rebalanced — supersedes the stale `.claude/pca-sequences.json`)

| Batch slug | Domain | Count |
|---|---|---|
| `design-plan-A` | Section 1: Designing and planning a cloud solution architecture (part 1) | 30 |
| `design-plan-B` | Section 1: Designing and planning a cloud solution architecture (part 2) | 30 |
| `provisioning` | Section 2: Managing and provisioning a cloud solution infrastructure | 42 |
| `security` | Section 3: Designing for security and compliance | 42 |
| `processes` | Section 4: Analyzing and optimizing technical and business processes | 36 |
| `implementation` | Section 5: Managing implementation | 30 |
| `operations` | Section 6: Ensuring solution and operations excellence | 30 |
| `case-study` | Cross-cuts all sections, bound via `caseStudyId` — 15 per case study × 4 | 60 |
| **TOTAL** | | **300** |

### Output files

Each domain batch writes `src/data/questions/gcp-pca-batch-{slug}.json`. The case-study batch is internally split into 4 sub-batch files (one per case study, 15 questions each) to keep authoring focused:
`gcp-pca-batch-case-study-{altostrat-media|cymbal-retail|ehr-healthcare|knightmotives-automotive}.json`

Total batch files = 7 domain + 4 case study = **11 batch JSON files**.

### Merge script — `scripts/merge-gcp-pca.mjs`

New Node ESM script (matches pattern of `splitOptionExplanations.mjs`). Behavior:

1. Read all 11 batch files.
2. Read case-study source from `.claude/pca-case-studies.json` (see open question Q2).
3. Concatenate `questions` arrays in domain order, then case-study cluster.
4. Within each batch, force `correctAnswers[0]` position to follow the sequence from `.claude/pca-sequences.json` (regenerated).
5. Validate:
   - Unique ids.
   - Every `caseStudyId` matches a record in `caseStudies`.
   - Each case study is referenced by exactly 15 questions.
   - 4 options per question.
   - No `Ã—`, `â€"`, `â€™`, `””`, `''` artifacts (regex; fail and list offending ids).
   - Correct-answer length is the longest in ≤ 50% of questions (warn if exceeded).
6. Write `src/data/questions/gcp-pca.json` with `examId: "gcp-pca"`, `version: 2`, `placeholder: false`, `generatedAt: <today>`, merged `questions`, and `caseStudies` array.
7. Print summary: total, per-section counts, per-case-study counts, position distribution.

### Post-processor

After merge: run `node scripts/splitOptionExplanations.mjs`. Add `'gcp-pca.json'` to its `BANK_FILES` constant.

### Regenerating `.claude/pca-sequences.json`

The existing file has stale sizes. Coder regenerates with this snippet (run once, not committed as a script):

```js
import { writeFileSync } from 'fs';

const batches = {
  'design-plan-A': 30,
  'design-plan-B': 30,
  'provisioning': 42,
  'security': 42,
  'processes': 36,
  'implementation': 30,
  'operations': 30,
  'case-study': 60,
};

function balancedShuffledSeq(n) {
  const base = Math.floor(n / 4);
  const extra = n % 4;
  const counts = [0, 1, 2, 3].map((i) => base + (i < extra ? 1 : 0));
  const arr = [];
  for (let pos = 0; pos < 4; pos++) for (let k = 0; k < counts[pos]; k++) arr.push(pos);
  let s = 0xDEADBEEF;
  function rand() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { n, seq: arr, counts };
}

const out = {};
for (const [k, n] of Object.entries(batches)) out[k] = balancedShuffledSeq(n);
writeFileSync('.claude/pca-sequences.json', JSON.stringify(out, null, 2));
```

For the case-study sequence (n=60), counts are `[15,15,15,15]`. The merge script slices into 4 chunks of 15 (one per case study); if any chunk's per-position spread is worse than `[4,4,4,3]`, reshuffle within the chunk preserving overall counts.

### Authoring prompt template (reused per batch)

Identical to the template in `certprep-spec.md` lines 369–410 with these PCA-specific additions:
- `EXAM_CODE = PCA`, `EXAM_ID = gcp-pca`
- `OFFICIAL_URL = https://cloud.google.com/learn/certification/guides/professional-cloud-architect`
- Multi-answer ratio: 15%
- Difficulty mix: 20% easy / 50% medium / 30% hard
- Must include v6.1 subtopics from `.claude/pca-case-studies.md` across the domain batches.
- For the case-study batches: every question MUST reference specific facts from the assigned scenario. Include `caseStudyId` field per question.
- Concatenated `explanation` MUST start each per-option chunk with `Option A is …` / `Option B is …` / etc so `splitOptionExplanations.mjs` can parse it.
- ID format: `pca-{batch-slug}-NNN` for domain batches, `pca-cs-{case-study-slug}-NNN` for case studies.

---

## 7. Acceptance criteria

- [ ] `npm run build` exits 0 with zero errors and zero warnings.
- [ ] `npm run lint` exits 0.
- [ ] `src/data/questions/gcp-pca.json` exists, validates against `QuestionBankFile`, has `version: 2`, `placeholder: false`, exactly 300 questions and exactly 4 entries in `caseStudies`.
- [ ] All 300 question ids are unique.
- [ ] Every question has exactly 4 options, `correctAnswers.length >= 1`, all indices in `[0..3]`.
- [ ] Per-batch counts: 30 / 30 / 42 / 42 / 36 / 30 / 30 / 60.
- [ ] Each of the 4 `caseStudyId` values is referenced by exactly 15 questions.
- [ ] Every question with a `caseStudyId` has a matching entry in `caseStudies[]`.
- [ ] Each `correctAnswers[0]` position (0, 1, 2, 3) appears 65–85 times across all 300 questions.
- [ ] In ≤ 50% of questions, the correct answer is the longest option.
- [ ] Multi-answer questions are between 12% and 18% of the bank.
- [ ] No `Ã—`, `â€"`, `â€™`, `””`, `''`, or stray smart-quote artifacts anywhere in the JSON.
- [ ] `splitOptionExplanations.mjs` reports `parsed=300 skipped=0` for `gcp-pca.json` after running.
- [ ] Every question has an `optionExplanations` array of length 4.
- [ ] Starting a PCA session loads case studies and clusters case-study questions contiguously.
- [ ] Practice and Exam mode both render the case study panel above questions with `caseStudyId`.
- [ ] Case study panel is keyboard-accessible (focusable toggle, `aria-expanded` announced).
- [ ] Tested at 375px and 1440px viewports in both light and dark mode (designer review).
- [ ] `ReviewItem` shows the case study title badge on review entries that came from a case-study question.
- [ ] Resume-session works: reload mid-PCA-session, case studies and clustering survive.
- [ ] No new console errors or warnings during a full PCA session.
- [ ] Designer signs off on `CaseStudyPanel.tsx` and `ExamRunner.tsx` changes.
- [ ] QA signs off on functional flow (start, navigate, flag, submit, review) for both modes.

---

## 8. Risks and open questions

**Q1. Forced vs. probabilistic case-study inclusion per session.**
A 60-question session drawn randomly from 300 yields an expected 60 × (60/300) = 12 case-study questions, with non-trivial variance — some sessions could see 4, others 20. Real PCA shows exactly 2 of 4 case studies (each with ~4–6 questions). **Architect recommends:** Force inclusion. Modify `selectQuestions` so that when the bank has `caseStudies`, the function reserves slots: pick 2 case studies at random, take a random 4–6 questions from each (8–12 total case-study questions), then fill remaining slots from non-case-study pool. **Open: confirm with user before coder implements.**

**Q2. Case study source — JSON file or inlined in merge script?**
Two options: (a) author `.claude/pca-case-studies.json` mirroring the markdown and have `merge-gcp-pca.mjs` read it; (b) inline the four CaseStudy objects directly in `merge-gcp-pca.mjs`. **Architect recommends (a)** — easier to spot-check, diff, and re-use if the schema later supports case studies on other exams. **Open: confirm.**

**Q3. Verbatim vs. paraphrased scenario text.**
The plan is to reproduce **verbatim** (already in the repo for reference and matches what users see on the real exam). If legal concerns exist, paraphrase — but this is a content decision, not a technical one. **Open: confirm verbatim is acceptable.**

---

## 9. Step-by-step build order for the coder

1. **Schema** — Edit `src/types/index.ts`: add `CaseStudy`, add optional `caseStudyId` to `Question`, add optional `caseStudies` to `QuestionBankFile`, add optional `caseStudies` to `ExamSession`.
2. **Exam metadata** — Edit `src/data/exams.ts`: add `disableOptionShuffle: true` to the PCA entry.
3. **Load path** — Update `src/lib/examLogic.ts`: change `loadQuestionBank` to return `LoadedBank`. Update the single caller in `src/store/useExamStore.ts`.
4. **Pool clustering** — Update `src/lib/questionPool.ts`: add the cluster-by-`caseStudyId` pass after shuffle. (Optionally Q1's forced-inclusion logic if user approves.)
5. **CaseStudyPanel component** — Create `src/components/CaseStudyPanel.tsx`. Wait for designer spec.
6. **ExamRunner wiring** — Update `src/components/ExamRunner.tsx`. Track per-case-study expanded state. Auto-expand on cluster entry.
7. **ReviewItem badge** — Update `src/components/ReviewItem.tsx`.
8. **Sequence regeneration** — Run the inline Node snippet (§6) to rewrite `.claude/pca-sequences.json`.
9. **Case study source** — Create `.claude/pca-case-studies.json` from `.claude/pca-case-studies.md` (verbatim, per Q3).
10. **Author batches** — Generate the 11 batch JSON files using the prompt template. Spot-check 5–10 per batch.
11. **Merge script** — Create `scripts/merge-gcp-pca.mjs`. Run it.
12. **Split rationales** — Add `'gcp-pca.json'` to `BANK_FILES` in `scripts/splitOptionExplanations.mjs` and run it.
13. **Build + lint** — Fix until clean.
14. **Manual smoke** — Start a PCA practice session. Verify panel renders, clustering works, options don't shuffle, per-option rationales display.
15. **Hand off to designer** — Review `CaseStudyPanel`, `ExamRunner` mods, `ReviewItem` badge in both themes at 375px and 1440px.
16. **Hand off to QA** — Playwright suite + full PCA practice-mode flow including resume.
17. **Sign-off** — Both designer and QA approve before merge.

---

## Summary

This plan adds first-class case-study support to CertPrep (new `CaseStudy` type, optional `caseStudyId` on `Question`, optional `caseStudies` on `QuestionBankFile` and `ExamSession`) and uses it to build a real 300-question GCP PCA bank with 4 case studies × 15 questions and 240 domain questions split by official v6.1 weights. The runner pins a collapsible `CaseStudyPanel` above any question with a `caseStudyId`, and `selectQuestions` clusters same-case-study questions contiguously so users don't re-read the scenario. Schema is fully backward-compatible — all other exams remain unchanged. Three open questions for the user before the coder starts: (1) forced 2-of-4 case-study inclusion per session, (2) case-study source as standalone `.claude/pca-case-studies.json`, (3) verbatim scenario text. Designer review is required for `CaseStudyPanel.tsx`, `ExamRunner.tsx`, and `ReviewItem.tsx`.
