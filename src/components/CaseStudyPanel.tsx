import type { CaseStudy } from '@/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const SECTION_LABELS = {
  companyOverview: 'Company Overview',
  solutionConcept: 'Solution Concept',
  existingTechnicalEnvironment: 'Existing Technical Environment',
  businessRequirements: 'Business Requirements',
  technicalRequirements: 'Technical Requirements',
  executiveStatement: 'Executive Statement',
} as const

type SectionKey = keyof typeof SECTION_LABELS

// Fixed order matching the official Google exam PDF
const SECTION_ORDER: SectionKey[] = [
  'companyOverview',
  'solutionConcept',
  'existingTechnicalEnvironment',
  'businessRequirements',
  'technicalRequirements',
  'executiveStatement',
]

const LIST_SECTIONS = new Set<SectionKey>(['businessRequirements', 'technicalRequirements'])

interface CaseStudyPanelProps {
  caseStudy: CaseStudy
  expanded: boolean
  onToggle: (open: boolean) => void
}

function CaseStudyPanel({ caseStudy, expanded, onToggle }: CaseStudyPanelProps) {
  return (
    <section aria-labelledby={`case-study-title-${caseStudy.id}`}>
      <Accordion
        type="single"
        collapsible
        value={expanded ? 'case-study-body' : ''}
        onValueChange={(val) => onToggle(val === 'case-study-body')}
        className="rounded-lg border bg-card shadow-sm overflow-hidden"
      >
        <AccordionItem value="case-study-body" className="border-b-0">
          <AccordionTrigger
            id={`case-study-title-${caseStudy.id}`}
            className="h-12 px-4 hover:bg-accent hover:no-underline transition-colors rounded-t-lg data-[state=closed]:rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-muted text-muted-foreground shrink-0">
                  Case Study
                </span>
                <span className="text-base font-semibold text-foreground truncate">
                  {caseStudy.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium rounded-full px-2.5 py-0.5 border bg-secondary text-secondary-foreground border-[#4285F4]/60 dark:bg-[#4285F4]/20 dark:text-[#4285F4] dark:border-transparent">
                  {caseStudy.industry}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="max-h-[60vh] sm:max-h-96 lg:max-h-[calc(100vh-8rem)] overflow-y-auto px-4 pb-5 pt-4">
              <div className="max-w-prose space-y-6">
                {SECTION_ORDER.map((key) => {
                  const isList = LIST_SECTIONS.has(key)

                  if (isList) {
                    const items = caseStudy[key] as string[]
                    if (!items || items.length === 0) return null
                    return (
                      <section key={key} aria-labelledby={`cs-${key}-${caseStudy.id}`}>
                        <h3
                          id={`cs-${key}-${caseStudy.id}`}
                          className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2"
                        >
                          {SECTION_LABELS[key]}
                        </h3>
                        <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground list-none pl-0">
                          {items.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span
                                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0"
                                aria-hidden="true"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  }

                  const value = caseStudy[key] as string
                  if (!value) return null
                  return (
                    <section key={key} aria-labelledby={`cs-${key}-${caseStudy.id}`}>
                      <h3
                        id={`cs-${key}-${caseStudy.id}`}
                        className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2"
                      >
                        {SECTION_LABELS[key]}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {value}
                      </p>
                    </section>
                  )
                })}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}

export default CaseStudyPanel
