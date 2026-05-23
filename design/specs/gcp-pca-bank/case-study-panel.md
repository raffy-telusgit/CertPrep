# CaseStudyPanel — Visual + Interaction Spec

**Feature:** GCP PCA Case Study Support
**Produced:** 2026-05-22
**Designer:** Mode 1 (pre-implementation)
**Input:** `design/specs/gcp-pca-bank.md` (architect plan), `.claude/pca-case-studies.md` (content), existing components
**Downstream:** Coder implements `CaseStudyPanel.tsx`, `ExamRunner.tsx` changes, `ReviewItem.tsx` badge

---

## 1. Component anatomy

The panel is a single collapsible region inserted above the `QuestionCard` within the `ExamRunner` column. It has two visual zones: a **title bar** (always visible) and a **body** (visible only when expanded).

```
┌─────────────────────────────────────────────────────┐  ← outer: rounded-lg border bg-card
│  TITLE BAR (always rendered, h-12, click to toggle) │
│  ┌──────────────────────────────────────────────┐   │
│  │ [Case Study]  Altostrat Media  [Media]  [^]  │   │  ← label + title + industry tag + chevron
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤  ← border-t (only when expanded)
│  BODY (AccordionContent — shown when expanded)      │
│  ┌──────────────────────────────────────────────┐   │
│  │  [scrollable inner div — max-h varies by bp] │   │
│  │                                              │   │
│  │  ## Company Overview                         │   │
│  │  <paragraph>                                 │   │
│  │                                              │   │
│  │  ## Solution Concept                         │   │
│  │  <paragraph>                                 │   │
│  │                                              │   │
│  │  ## Existing Technical Environment           │   │
│  │  <paragraph>                                 │   │
│  │                                              │   │
│  │  ## Business Requirements                    │   │
│  │  • item                                      │   │
│  │  • item                                      │   │
│  │                                              │   │
│  │  ## Technical Requirements                   │   │
│  │  • item                                      │   │
│  │  • item                                      │   │
│  │                                              │   │
│  │  ## Executive Statement                      │   │
│  │  <paragraph>                                 │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Sticky vs. scrollable:**
- The **outer panel** (title bar + body together) is NOT sticky — it flows in normal document order above the QuestionCard.
- The **body inner div** is internally scrollable with a `max-h` cap. The user scrolls within the panel to read its content, then continues past to the question card.

---

## 2. Layout and sizing

### Position in ExamRunner

The panel is inserted inside the existing `space-y-6` stack, between the progress bar row and the question card transition wrapper:

```
<div className="max-w-4xl mx-auto space-y-6">
  {/* 1. Progress bar + info  (existing) */}
  {/* 2. CaseStudyPanel       (NEW — only when displayQuestion.caseStudyId is set) */}
  {/* 3. Question card div    (existing) */}
  {/* 4. Navigation footer    (existing) */}
  {/* 5. Question navigator   (existing) */}
  {/* 6. CertBot              (existing) */}
</div>
```

The panel inherits the column's `max-w-4xl` and `px-4` / `px-8` horizontal padding from the `<main>` wrapper. No additional horizontal margin is needed.

### Mobile (< 640px)

- Full column width.
- **Collapsed by default** on every question in the cluster except the first. On the first question of a new case-study cluster, auto-expanded.
- Collapsed: title bar only, `h-12`.
- Expanded body inner div: `max-h-[60vh] overflow-y-auto`. Body padding: `px-4 py-4`.

Rationale: KnightMotives renders roughly 2,800 characters across 6 sections. At 375px with `text-sm` this is ~90 viewport-heights tall. Capping at `60vh` keeps the scenario readable without forcing the user to scroll entirely past it before reaching the question.

### Tablet (640px–1023px — `sm:` prefix)

- Same single-column layout.
- Body inner div: `sm:max-h-96` (384px ≈ 18 lines of body text).

### Desktop (1024px+ — `lg:` prefix)

- Same single-column layout, no side-by-side split.
- Body inner div: `lg:max-h-[calc(100vh-8rem)] overflow-y-auto`. On a 1080px display this is ~952px — accommodates the entire KnightMotives content without an internal scrollbar. On 720px it caps at ~592px with a scrollbar.
- Not sticky at this breakpoint. Avoids the `top`-offset coupling with the header.

---

## 3. Collapsed vs. expanded states

### Visual states

**Collapsed:**
```
┌────────────────────────────────────────────────┐
│ [Case Study]  Altostrat Media  [Media]    ↓    │  h-12, px-4
└────────────────────────────────────────────────┘
```
Height: `h-12` (48px). Body region is not in the DOM (Radix accordion removes it when closed).

**Expanded:**
```
┌────────────────────────────────────────────────┐
│ [Case Study]  Altostrat Media  [Media]    ↑    │  h-12, px-4
├────────────────────────────────────────────────┤
│  [scrollable body — max-h varies by bp]        │
│  Company Overview                              │
│  ...                                           │
└────────────────────────────────────────────────┘
```

### Auto-expand rule (implemented in ExamRunner, not CaseStudyPanel)

`ExamRunner` maintains: `const [expandedCaseStudyId, setExpandedCaseStudyId] = useState<string | null>(null)` — one state slot is sufficient because only one panel is visible at a time.

Logic in `ExamRunner`:
1. When `displayQuestion.caseStudyId` changes to a new non-null value (first question of a different cluster), call `setExpandedCaseStudyId(displayQuestion.caseStudyId)` to auto-expand.
2. When the user toggles (`onToggle`), update via `setExpandedCaseStudyId(prev => prev === id ? null : id)`.
3. Pass `expanded={expandedCaseStudyId === caseStudy.id}` and `onToggle` to `CaseStudyPanel`.

The panel itself is fully controlled — no internal expanded state.

### Transition

Use the shadcn `Accordion` / `AccordionContent` which drives the `animate-accordion-down` / `animate-accordion-up` keyframes already in `tailwind.config.js`. `0.2s ease-out` height animation. The `tailwindcss-animate` plugin handles `prefers-reduced-motion` automatically (no extra work needed).

---

## 4. Section rendering inside expanded body

Six sections render in fixed order: companyOverview → solutionConcept → existingTechnicalEnvironment → businessRequirements → technicalRequirements → executiveStatement. No dividers — vertical spacing alone creates rhythm.

### Overall body layout

```
<div className="px-4 pb-5 pt-4">
  <div className="max-w-prose space-y-6">
    <section aria-labelledby="cs-company-overview-{id}"> ... </section>
    <section aria-labelledby="cs-solution-concept-{id}"> ... </section>
    ...
  </div>
</div>
```

- `space-y-6` (24px) between sections.
- `max-w-prose` (65ch) caps paragraph and list width for readability. On a narrow 375px panel the cap is irrelevant; on desktop it prevents text from stretching across the full 896px column.

### Paragraph sections (companyOverview, solutionConcept, existingTechnicalEnvironment, executiveStatement)

```
<section aria-labelledby="cs-{sectionKey}-{caseStudyId}">
  <h3 id="cs-{sectionKey}-{caseStudyId}"
      className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
    Company Overview
  </h3>
  <p className="text-sm leading-relaxed text-muted-foreground">
    {caseStudy.companyOverview}
  </p>
</section>
```

- Heading: `text-sm font-semibold uppercase tracking-wide text-foreground`. Small-caps anchors each section without competing with the question text (`text-lg`) or panel title (`text-base font-semibold`).
- Paragraph: `text-sm leading-relaxed text-muted-foreground`. Subordinates scenario to the question.
- Heading bottom margin: `mb-2` (8px) — heading + paragraph read as a unit.

### List sections (businessRequirements, technicalRequirements)

```
<section aria-labelledby="cs-{sectionKey}-{caseStudyId}">
  <h3 id="cs-{sectionKey}-{caseStudyId}"
      className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
    Business Requirements
  </h3>
  <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground list-none pl-0">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
</section>
```

- Custom bullet: `1.5×1.5` filled circle in `bg-muted-foreground`, offset `mt-1.5` to align with first line.
- `list-none pl-0` removes browser defaults.
- `space-y-1.5` (6px) between items.
- Long items wrap normally — never truncate.
- `flex gap-2` (8px) between bullet and text.

### Section display names

The coder maps field keys to display strings as a constant inside `CaseStudyPanel.tsx`:

```
companyOverview          → "Company Overview"
solutionConcept          → "Solution Concept"
existingTechnicalEnvironment → "Existing Technical Environment"
businessRequirements     → "Business Requirements"
technicalRequirements    → "Technical Requirements"
executiveStatement       → "Executive Statement"
```

Full headers match the official Google exam PDF.

---

## 5. Title bar

### Layout

Interior flex: `flex items-center gap-3 w-full`.

Left group: `[case study pill] [title]` — `flex items-center gap-2 flex-1 min-w-0`
Right group: `[industry tag] [chevron]` — `flex items-center gap-2 shrink-0`

The left group gets `flex-1 min-w-0` so the title truncates before the right group wraps.

**"Case Study" pill:**
- `<span className="text-xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-muted text-muted-foreground">Case Study</span>`
- Announces "this is a case study" without relying on context. Helpful when the panel first appears after a non-case-study question.

**Title:**
- `text-base font-semibold text-foreground truncate`. Defensive truncation for hypothetical long titles.

**Industry tag (revised tokens for contrast):**

| Mode | Background | Text | Border |
|---|---|---|---|
| Light | `bg-secondary` (`hsl(210 40% 96.1%)`) | `text-secondary-foreground` (`hsl(222.2 47.4% 11.2%)`) | `border border-[#4285F4]/60` |
| Dark | `bg-[#4285F4]/20` | `text-[#4285F4]` | `border-transparent` |

Implementation:
```
className="text-xs font-medium rounded-full px-2.5 py-0.5 border bg-secondary text-secondary-foreground border-[#4285F4]/60 dark:bg-[#4285F4]/20 dark:text-[#4285F4] dark:border-transparent shrink-0"
```

Contrast: ~9:1 light, ~4.8:1 dark — both AA pass.

**Chevron:**
- `<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />`
- The shadcn `AccordionTrigger` already wires `[&[data-state=open]>svg]:rotate-180` — no extra rotation class needed.

### Full title bar as click target

The entire `h-12` title bar is the click target — gives 48px touch target on mobile (Apple HIG / Material guidelines), keyboard `Enter`/`Space` works from anywhere, matches the `ReviewItem` row interaction.

The `AccordionTrigger` renders as `AccordionPrimitive.Trigger` (a `<button>` with `flex flex-1`). Add:

```
<AccordionTrigger
  className="h-12 px-4 hover:bg-accent hover:no-underline transition-colors rounded-t-lg data-[state=closed]:rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
>
```

`data-[state=closed]:rounded-b-lg` rounds the bottom corners when collapsed (no body below); when expanded, the body renders and the trigger's bottom radius is absorbed by the section underneath.

### ARIA on the trigger

`AccordionPrimitive.Trigger` automatically sets `aria-expanded` and `aria-controls`. The coder sets `id="case-study-title-{caseStudy.id}"` on the trigger and uses that as `aria-labelledby` on the outer `<section>`.

---

## 6. Color tokens (light + dark)

All tokens from `src/index.css`. No new tokens introduced.

| Element | Light | Dark | Notes |
|---|---|---|---|
| Panel outer background | `bg-card` | `bg-card` | Matches QuestionCard wrapper |
| Panel border | `border border-border` | `border border-border` | Same 1px as the question card |
| Title text | `text-foreground` | `text-foreground` | ~21:1 / ~17:1 — AAA |
| "Case Study" pill bg | `bg-muted` | `bg-muted` | — |
| "Case Study" pill text | `text-muted-foreground` | `text-muted-foreground` | ~5.5:1 / ~4.6:1 — AA |
| Industry tag (see §5) | `bg-secondary` border `border-[#4285F4]/60` | `bg-[#4285F4]/20` | ~9:1 / ~4.8:1 — AA |
| Section heading (`<h3>`) | `text-foreground` | `text-foreground` | AAA |
| Body paragraph / list text | `text-muted-foreground` | `text-muted-foreground` | ~4.7:1 / ~5.1:1 — AA |
| Title bar hover | `hover:bg-accent` | `hover:bg-accent` | Consistent with ReviewItem |
| Body region background | transparent (inherits `bg-card`) | transparent | — |
| Scrollbar (body) | browser default | browser default | No custom scrollbar — avoid custom CSS |

---

## 7. Accessibility checklist

### Keyboard

- Title bar is `<button>` — natively focusable.
- `Tab` reaches it in document order (before QuestionCard).
- `Enter` and `Space` toggle expand/collapse — standard button behavior.
- When expanded, `Tab` moves into body content. After the body's last focusable element (or immediately, if body has no focusable elements), `Tab` moves to QuestionCard.
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`. `ring-inset` positions the ring inside the border so it doesn't overlap adjacent elements.

### Screen reader

- Outer panel wrapper: `<section aria-labelledby="case-study-title-{id}">`. Lets screen reader users jump to the case study region.
- Each section inside body: `<section aria-labelledby="cs-{key}-{id}">` with matching `<h3 id="cs-{key}-{id}">`. Navigable via heading (`h`) or region (`r`) shortcuts.
- List sections use standard `<ul><li>` — announced as "list of N items."

### Color contrast (summary)

- Title text on `bg-card`: ~21:1 light, ~17:1 dark — AAA.
- Body text (`text-muted-foreground`): ~4.7:1 light, ~5.1:1 dark — AA (marginal in light; do not lower the token).
- Section headings: same as title — AAA.
- Industry tag: ~9:1 light, ~4.8:1 dark — AA.

### Reduced motion

`tailwindcss-animate` plugin's `animate-accordion-down`/`up` keyframes are automatically disabled by `@media (prefers-reduced-motion: reduce)`. No extra handling needed.

### Focus order within ExamRunner (after panel is added)

1. Progress info (not focusable)
2. Timer
3. **Case study title bar button (new — when `caseStudyId` is set)**
4. QuestionCard: flag → radio/checkbox options
5. Previous / Next / Submit buttons
6. Question navigator buttons
7. CertBot robot (practice mode)

---

## 8. ReviewItem case-study badge

Position: in the existing badge row at the bottom of the expanded `ReviewItem` body, after category + difficulty, before flagged.

```jsx
<div className="flex items-center gap-2">
  <Badge variant="secondary">{question.category}</Badge>
  <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
  {question.caseStudyId && caseStudyTitle && (
    <Badge
      variant="outline"
      className="border-[#4285F4]/60 text-foreground max-w-40 truncate"
      title={caseStudyTitle}
    >
      {caseStudyTitle}
    </Badge>
  )}
  {flagged && <Badge variant="outline" className="text-yellow-600 border-yellow-500">...}
</div>
```

`ReviewItem` needs a new `caseStudyTitle?: string` prop (the resolved title — caller looks it up; `ReviewItem` does not).

- Size inherits `Badge` defaults: `text-xs px-2.5 py-0.5 rounded-full`.
- Truncation: `max-w-40 truncate` (160px ≈ ~20 characters). "KnightMotives Automotive" truncates to "KnightMotives Autom…". `title` attribute provides full text on hover.

### Dark mode

`border-[#4285F4]/60` visible in both modes. `text-foreground` meets AAA on `bg-card` in both modes.

---

## 9. Reduced-motion fallback and edge cases

### Long bullets (3-line technicalRequirements item)

Wrap normally within the `<li>` flex container. `mt-1.5` keeps the bullet dot aligned to the first line. No truncation, no tooltip.

### Resize from desktop to mobile mid-session (panel expanded)

`max-h` is set responsively (`max-h-[60vh] sm:max-h-96 lg:max-h-[calc(100vh-8rem)]`). The browser re-evaluates on resize. Panel remains expanded. Scroll position resets to 0 on layout reflow at a breakpoint boundary (browser default) — acceptable.

### CaseStudyId not found in session.caseStudies

Defensive null check: if the looked-up `caseStudy` is `undefined`, render nothing. Silent omission is less disruptive than a broken state. The merge script validation should prevent this from reaching production.

### CaseStudy with empty requirement arrays

If a requirements array is empty, omit the entire `<section>` rather than rendering an empty `<ul>`. Defensive — the four real case studies all have populated arrays.

### Panel during question card transition

`ExamRunner` fades the question card on navigation (`opacity-0 translate-x-2` → `opacity-100 translate-x-0`, 150ms). The panel is OUTSIDE the question card's transition wrapper — it does not fade with the question. Intentional: the panel represents stable scenario context, not the changing question. When transitioning between cluster boundaries, the panel auto-expands with the new case study via the accordion animation.

---

## 10. Implementation notes for the coder

### Primitives to use

- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` from `@/components/ui/accordion` — already in the project.
- `Badge` from `@/components/ui/badge` — for the ReviewItem badge.
- `cn` from `@/lib/utils` — for conditional class merging.
- `ChevronDown` from `lucide-react` — already rendered by the shadcn AccordionTrigger wrapper.

No new shadcn components required. No new dependencies.

### AccordionContent scroll pattern

`AccordionPrimitive.Content` has `overflow-hidden` (needed for the height animation). Place the scrollable div inside its children:

```
<AccordionContent>
  <div className="max-h-[60vh] sm:max-h-96 lg:max-h-[calc(100vh-8rem)] overflow-y-auto px-4 pb-5 pt-1">
    <div className="max-w-prose space-y-6">
      {/* sections */}
    </div>
  </div>
</AccordionContent>
```

The outer `overflow-hidden` on `AccordionPrimitive.Content` does not prevent inner `overflow-y-auto` from working.

### Controlled Accordion pattern

```
<Accordion
  type="single"
  collapsible
  value={expanded ? 'case-study-body' : ''}
  onValueChange={(val) => onToggle(val === 'case-study-body')}
  className="rounded-lg border bg-card shadow-sm"
>
  <AccordionItem value="case-study-body" className="border-b-0">
    <AccordionTrigger className="h-12 px-4 hover:bg-accent hover:no-underline transition-colors rounded-t-lg data-[state=closed]:rounded-b-lg focus-visible:ring-inset">
      {/* title bar content */}
    </AccordionTrigger>
    <AccordionContent>
      {/* scrollable body */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

`border-b-0` on AccordionItem removes the default shadcn bottom border (panel outer border handles the edge).

### Props shape

```typescript
interface CaseStudyPanelProps {
  caseStudy: CaseStudy
  expanded: boolean
  onToggle: () => void
}
```

Fully controlled. No internal state.

```typescript
interface ReviewItemProps {
  question: Question
  selected: number[]
  flagged: boolean
  index: number
  caseStudyTitle?: string  // NEW
}
```

### Classes to NEVER use (per CLAUDE.md §5 and §11)

- No arbitrary spacing/sizing: `p-[13px]`, `h-[48px]`, `text-[17px]`, `gap-[6px]`. Use scale values: `p-3`, `h-12`, etc.
- `bg-[#4285F4]/10`, `bg-[#4285F4]/20`, `border-[#4285F4]/60` are permitted — raw hex with opacity modifier, consistent with existing usage in `QuestionCard.tsx` (`bg-green-500/10`, `bg-primary/10`).
- `max-h-[60vh]` and `max-h-[calc(100vh-8rem)]` are arbitrary values but unavoidable — viewport-relative caps have no Tailwind scale equivalent. These are necessary, not stylistic.
- No `max-w-[10rem]` — use `max-w-40` instead.
- No `style={{}}` inline styles except dynamically computed values.
- No custom CSS files.
- No `console.log` left in the component.

---

## Summary

This spec defines a collapsible `CaseStudyPanel` that sits above the `QuestionCard` in `ExamRunner` whenever the current question has a `caseStudyId`. The panel uses the existing shadcn `Accordion` primitive (controlled mode) with a `0.2s ease-out` height animation that auto-disables under `prefers-reduced-motion`. The title bar is a full-width `h-12` button carrying the case study title, a GCP-branded industry tag, and a chevron — the full bar is the click target for accessibility. The expanded body is an internally scrollable div (`max-h-[60vh]` mobile, `sm:max-h-96` tablet, `lg:max-h-[calc(100vh-8rem)]` desktop) containing six `<section>` regions rendered in a `space-y-6 max-w-prose` wrapper. Color tokens are exclusively from `src/index.css` CSS variables except the GCP vendor accent `#4285F4` (permitted per CLAUDE.md §6 for exam-specific UI). All contrast ratios meet WCAG AA in both light and dark mode. The component is fully controlled (no internal state), exposes three props (`caseStudy`, `expanded`, `onToggle`), and requires no new dependencies. `ReviewItem` gains a `caseStudyTitle?: string` prop and renders a `max-w-40 truncate` GCP-bordered badge after the existing category/difficulty badges.
