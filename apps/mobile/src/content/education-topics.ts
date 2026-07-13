/**
 * Learn tab content structure (FR-EDU-002, FR-EDU-004). Display text
 * (title/body, EN/AR) lives in the i18n translation files under
 * `learnTopics.<id>.title` / `.body` — this file only holds the stable
 * id/category/related-terms structure, so content updates are
 * translation-file-only changes.
 */
import type { GlossaryTermId } from './glossary'

export const EDUCATION_CONTENT_VERSION = 'v1'

export type EducationCategory = 'conventional' | 'islamic' | 'cards'

export interface EducationTopic {
  readonly id: string
  readonly category: EducationCategory
  readonly relatedTerms: readonly GlossaryTermId[]
}

export const EDUCATION_TOPICS: readonly EducationTopic[] = [
  {
    id: 'howLoansWork',
    category: 'conventional',
    relatedTerms: ['principal', 'interest', 'installment', 'amortization'],
  },
  {
    id: 'fixedVsVariable',
    category: 'conventional',
    relatedTerms: ['fixedRate', 'variableRate', 'repricing'],
  },
  {
    id: 'residualBalance',
    category: 'conventional',
    relatedTerms: ['residualBalance', 'balloonPayment'],
  },
  {
    id: 'earlyRepaymentConventional',
    category: 'conventional',
    relatedTerms: ['earlyRepayment', 'outstandingBalance'],
  },
  {
    id: 'howMurabahaWorks',
    category: 'islamic',
    relatedTerms: ['murabaha', 'financingAmount', 'profitRate'],
  },
  {
    id: 'whyNoInterestInIslamicFinancing',
    category: 'islamic',
    relatedTerms: ['interest', 'profitRate', 'murabaha'],
  },
  {
    id: 'earlySettlementAndIbra',
    category: 'islamic',
    relatedTerms: ['earlySettlement', 'ibra'],
  },
  {
    id: 'ijaraAndMusharakah',
    category: 'islamic',
    relatedTerms: ['ijara', 'diminishingMusharakah'],
  },
  {
    id: 'minimumPaymentVsPayingInFull',
    category: 'cards',
    relatedTerms: ['minimumPayment', 'financeCharges', 'gracePeriod'],
  },
  {
    id: 'creditUtilization',
    category: 'cards',
    relatedTerms: ['utilization', 'statementBalance'],
  },
]
