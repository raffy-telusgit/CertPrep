# CertPrep — Project Memory
 
This file loads into every Claude Code session. Read it first, follow it always.
 
---
 
## 1. What we're building
 
CertPrep is a browser-based practice exam app for cloud and platform certifications (Azure, AWS, GCP, ServiceNow). It runs entirely client-side — no backend, no runtime API calls, no user accounts. Question banks are static JSON files. All user data lives in `localStorage`.
 
**Supported exams:** AZ-900, AZ-104, AZ-305, SC-900, GCP PCA, GCP PCDE, GCP PCD, AWS SAP-C02, AWS DOP-C02, ServiceNow CAD.
 
**Core features:**
- Welcome screen with vendor-logo exam badges
- Exam mode (timed, matches real exam length) and Practice mode (untimed, instant feedback)
- Smart randomization: prefers unseen questions until pool exhausted
- Session resume on page reload
- History tracking with three reset options
- Dark/light theme
---
 
## 2. Multi-agent workflow
 
Four specialist agents. The main Claude orchestrates them.
 
### Standard flow for UI features
Anything that changes what the user sees on screen.
 
1. **architect** → produces an implementation plan (no code)
2. **designer** (Mode 1, spec) → produces a visual + interaction spec from the plan
3. **coder** → implements both
4. **qa** + **designer** (Mode 2, review) → parallel verification:
   - **qa** — functional tests via Playwright (does it work?)
   - **designer** — visual/a11y review via Playwright (does it look and feel right?)
Both qa AND designer must approve before declaring done.
 
### Flow for non-UI features
Logic, storage, types, refactors — anything that doesn't change the rendered UI.
 
1. **architect** → plans
2. **coder** → implements
3. **qa** → verifies
Designer is not invoked.
 
### Flow for trivial edits
Typo, single-line change, rename, copy tweak. Skip the workflow — main Claude handles it directly.
 
### Decision rule — when does designer get invoked?
- Touches anything in `src/components/**` → **designer is in the loop**
- Touches `tailwind.config.*`, shadcn theme files, or anything under `src/components/ui/**` → **designer is in the loop**
- Touches only `src/lib/`, `src/store/`, `src/data/`, or `src/types/` → designer is NOT invoked
- If unsure, ask the user
### Agent boundaries — never crossed
- **architect** does not write code
- **designer** does not write application code (only specs, reviews, and screenshots)
- **coder** does not write tests, visual specs, or design reviews
- **qa** does not fix bugs (files them back to coder)
- **qa** does not judge visual quality or accessibility (designer's job)
- **designer** does not run functional tests (qa's job)
### Tie-breakers
- **Designer** owns visual and accessibility verdicts. A designer FAIL on visual/a11y blocks merge regardless of qa's verdict.
- **QA** owns functional verdicts. A qa FAIL on functionality blocks merge regardless of designer's verdict.
- When something overlaps (e.g., focus rings — must be both visible *and* keyboard-reachable), both must approve.
When the user says "build this" or "add this feature," default to invoking the architect first unless they explicitly say otherwise.
 
---
 
## 3. Tech stack — do not deviate without asking
 
| Layer | Choice | Notes |
|---|---|---|
| Build tool | Vite | Not Next.js, not CRA |
| Framework | React 18 | Functional components only |
| Language | TypeScript (strict mode) | No `any`, prefer `unknown` and narrow |
| Styling | Tailwind CSS | No custom CSS files unless absolutely required |
| Components | shadcn/ui | First choice for any UI primitive |
| Icons | lucide-react (general), simple-icons (vendor logos) | |
| State | Zustand (global), useState (local) | No Redux, no MobX |
| Routing | React Router v6 | |
| Storage | localStorage | All keys prefixed `certprep:` |
| Dates | date-fns | Not moment, not dayjs |
| Testing | Playwright | E2E only for now, no unit tests unless asked |
| Package manager | npm | Not yarn, not pnpm |
 
**Adding a dependency requires explicit user approval.** Flag it, explain why, wait for confirmation.
 
---
 
## 4. Project structure
 
```
src/
├── components/
│   ├── ui/                # shadcn primitives (auto-generated)
│   ├── ExamBadge.tsx
│   ├── ExamSelector.tsx
│   ├── ModeSelector.tsx
│   ├── QuestionCard.tsx
│   ├── ExamRunner.tsx
│   ├── ResultsScreen.tsx
│   ├── ReviewItem.tsx
│   ├── HistoryView.tsx
│   ├── Timer.tsx
│   ├── ThemeToggle.tsx
│   └── Layout.tsx
├── lib/
│   ├── storage.ts         # localStorage CRUD
│   ├── questionPool.ts    # Smart randomization
│   ├── examLogic.ts       # Score calculation
│   └── theme.ts
├── data/
│   ├── exams.ts           # Exam metadata (don't hand-edit JSON)
│   └── questions/         # Generated question banks
├── store/
│   └── useExamStore.ts    # Zustand store
├── types/
│   └── index.ts           # All shared TS interfaces
├── App.tsx
└── main.tsx
 
design/
├── specs/                 # Designer Mode 1 outputs (per feature)
└── reviews/               # Designer Mode 2 screenshots and reports
    └── {feature-slug}/
        ├── light-mobile.png
        ├── light-desktop.png
        ├── dark-mobile.png
        └── dark-desktop.png
```
 
When adding a new file, place it in the matching directory. Do not create new top-level folders without asking.
 
---
 
## 5. Coding conventions
 
### TypeScript
- Strict mode is non-negotiable
- All shared types in `src/types/index.ts` — do not redefine inline
- Prefer `interface` over `type` for object shapes
- Function signatures must be fully typed (no implicit any returns)
- Use `as const` for literal narrowing, never `as SomeType` to bypass errors
### React
- Function declarations, not arrow assignments: `function MyComponent() {}` not `const MyComponent = () => {}`
- Props typed via `interface MyComponentProps { ... }` directly above the component
- Default exports for components, named exports for utilities
- Hooks at the top of the function, no conditional hooks
- Use `useCallback` and `useMemo` only when there's a measured performance reason — not by default
### File naming
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Constants files: `camelCase.ts` (e.g., `exams.ts`)
- One component per file unless tightly coupled
### Imports
- Use `@/` alias for `src/`
- Order: external packages → `@/` aliased → relative → types
- No barrel files (`index.ts` re-exports) unless explicitly approved
### Styling
- Tailwind utilities only
- Use shadcn's `cn()` helper for conditional classes
- Theme via CSS variables defined in shadcn's config
- No inline `style={{}}` unless dynamically computed (e.g., progress bar width)
- Spacing and typography from Tailwind's scale only — no arbitrary values like `p-[13px]` or `text-[17px]`
### State
- Zustand for app-wide state (current session, history)
- `useState` for component-local state
- Persist to `localStorage` via the `storage.ts` wrapper, never directly call `localStorage.setItem` from components
---
 
## 6. Theme & visual design
 
### Color tokens (Tailwind / shadcn variables)
- Background, foreground, primary, secondary, muted, accent, destructive — all via CSS variables
- No raw hex codes outside of `src/data/exams.ts`
- Vendor accent colors (only for badges and exam-specific UI):
  - Azure: `#0078D4`
  - AWS: `#FF9900`
  - GCP: `#4285F4`
  - ServiceNow: `#62D84E`
### Typography
- Font: system font stack (Tailwind default) — do not import Google Fonts
- Headings: `font-semibold` or `font-bold`, never `font-black`
- Body: `text-base leading-relaxed`
- Question text: `text-lg` for legibility during exams
### Layout
- Mobile-first, breakpoints `sm:` `md:` `lg:`
- Max content width: `max-w-4xl` for exam runner, `max-w-6xl` for history/results
- Generous padding on mobile (`px-4`), comfortable on desktop (`px-8`)
### Interaction
- Buttons: shadcn `<Button>` only — variants `default` `outline` `ghost` `destructive`
- Destructive actions (any reset, delete, submit-final) must use `<AlertDialog>` confirmation
- Loading states: shadcn `<Skeleton>` for content, spinner only for inline actions
- Transitions: Tailwind `transition-colors` and `transition-transform` only — no fancy animations unless asked
### Dark mode
- Implement via `class="dark"` on `<html>`, toggle via `useTheme()` hook
- All colors must work in both modes — test before declaring done
- Default to `system` preference on first load
---
 
## 7. Storage rules
 
All keys prefixed `certprep:`. Current keys:
- `certprep:history` — array of completed sessions
- `certprep:current-session` — in-progress session for resume
- `certprep:seen:{examId}` — array of seen question IDs per exam
- `certprep:theme` — `light` | `dark` | `system`
**Always go through `src/lib/storage.ts`.** Never call `localStorage` directly from components or other lib files.
 
**Reset semantics:**
- Reset History → clears `certprep:history` only
- Reset Question Tracker → clears all `certprep:seen:*`
- Reset Everything → clears all `certprep:*` keys EXCEPT `certprep:theme`
---
 
## 8. Question bank rules
 
- Files at `src/data/questions/{exam-id}.json`
- Schema defined in `src/types/index.ts` — never deviate
- Question banks are GENERATED, not hand-written. Do not edit individual questions in-app or by hand.
- Files marked `"placeholder": true` are fake testing data — they will be replaced before launch
- When generating real banks, follow the prompt template in the project spec — always web-fetch the official skills outline first
---
 
## 9. Commands
 
```bash
npm run dev      # dev server on :5173
npm run build    # production build — MUST pass before declaring a feature done
npm run lint     # eslint
npm run test     # Playwright e2e
npm run preview  # preview production build
```
 
After any substantive change, run `npm run build` and `npm run lint`. Fix all errors before declaring done.
 
### 9.1 Deployment (Gizmos)
 
CertPrep deploys to Gizmos as a **static site** — no Worker, no D1, no `/api/*` routes. Section 11 still applies: this app stays fully client-side.
 
- Config lives in `wrangler.toml` at the repo root. It contains only `name = "certprep"`. Do NOT add a `main = "worker.ts"` entry or a `[[d1_databases]]` block — the Gizmos backend-app guide does not apply here.
- The push tool lives at `skills/gizmos-push.mjs`. It reads `wrangler.toml` for the app name and uploads a directory.
- The standard deploy flow runs in a GitHub Codespace (not locally), using the `GIZMOS_API_KEY` and `GIZMOS_URL` configured on that Codespace:
 
```bash
git pull origin main
npm install
npm run build
node skills/gizmos-push.mjs dist/
```
 
After the first deploy, the app is reachable at `https://certprep.gizmos.run`. Skip Step 9 (`/api/init`) from the Gizmos guide — there is no database to seed.
 
---
 
## 10. Things to ALWAYS do
 
- Read this file at the start of every session
- Match existing patterns before introducing new ones
- Keep diffs minimal — only change what the task requires
- Run `npm run build` after substantive changes
- Use TypeScript strict mode and fix all errors, no suppressions
- Use shadcn primitives before reaching for raw HTML elements
- Persist all user data via `storage.ts`
- Confirm destructive actions via `AlertDialog`
- Test in both light and dark mode for any UI change
- Verify mobile responsiveness for any new component (375px) AND desktop (1440px)
- Invoke designer for any UI work (specs before, review after)
- When unclear, ask. Don't assume.
---
 
## 11. Things to NEVER do
 
- Do NOT add runtime API calls or backend dependencies — this app is fully client-side
- Do NOT add a state management library other than Zustand
- Do NOT add a CSS framework other than Tailwind
- Do NOT add a testing framework other than Playwright (without asking)
- Do NOT use `any` in TypeScript — use `unknown` and narrow
- Do NOT use `// @ts-ignore` or `// @ts-expect-error` to bypass type errors
- Do NOT call `localStorage` directly from components — go through `storage.ts`
- Do NOT add `console.log` to production code paths — use them for debugging then remove
- Do NOT introduce barrel files or re-export indexes
- Do NOT add Google Fonts, custom font files, or external CSS
- Do NOT add tracking, analytics, or telemetry of any kind
- Do NOT add user accounts, authentication, or sync — local only
- Do NOT hand-edit `src/data/questions/*.json` — they are generated
- Do NOT import from `react-router-dom` v5 patterns — we use v6 (`<Routes>`, `useNavigate`)
- Do NOT use `dangerouslySetInnerHTML` for question text — they're plain strings
- Do NOT install dependencies without flagging and getting approval
- Do NOT skip running `npm run build` before declaring done
- Do NOT write tests yourself if you're the coder — the qa agent owns testing
- Do NOT fix bugs if you're the qa agent — file them, don't fix them
- Do NOT skip designer review for UI changes — visual drift compounds fast
- Do NOT have designer write application code — specs and reviews only
---
 
## 12. Performance & quality
 
- Question pool is 300 per exam = ~2,700 total. Lazy-load JSON via dynamic import per exam, not all at once
- Bundle size budget: < 500KB gzipped initial load
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 95
- Keyboard navigation must work for the entire exam flow (no mouse required)
- Screen reader: questions and options must be announced correctly (use semantic HTML, ARIA only when needed)
---
 
## 13. Accessibility
 
- Every interactive element needs a visible focus ring (Tailwind's default `focus-visible:` is fine)
- Color contrast must meet WCAG AA in both themes
- Form controls need `<label>` associations
- Icons that convey meaning need `aria-label`
- Don't rely on color alone — use icons or text for state (e.g., correct/incorrect)
---
 
## 14. Browser support
 
- Latest 2 versions of Chrome, Firefox, Safari, Edge
- No IE11, no legacy Edge
- Mobile: iOS Safari 16+, Chrome Android (latest)
---
 
## 15. Definition of done
 
A task is done when:
- [ ] All architect's acceptance criteria pass
- [ ] Designer's spec (if applicable) was followed
- [ ] `npm run build` succeeds with zero errors and zero warnings
- [ ] `npm run lint` passes
- [ ] Manually tested in both light and dark mode
- [ ] Manually tested at mobile width (375px) and desktop (1440px)
- [ ] No new console errors or warnings in the browser
- [ ] QA agent has signed off on functionality (for non-trivial changes)
- [ ] Designer agent has signed off on visual + a11y (for any UI change)
- [ ] No `TODO` or `FIXME` left in the diff without an issue tracking it
 