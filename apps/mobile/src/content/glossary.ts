/**
 * Glossary content structure (FR-EDU-001, FR-EDU-004) — mirrors
 * docs/00-product/glossary.md term-ids. Display text (term label +
 * definition, EN/AR) lives in the i18n translation files under
 * `glossary.<id>.term` / `glossary.<id>.definition` — this file only holds
 * the stable id list, so content updates are translation-file-only changes.
 */

export const GLOSSARY_CONTENT_VERSION = 'v1'

export type GlossaryTermId =
  | 'obligation'
  | 'principal'
  | 'interest'
  | 'interestRate'
  | 'installment'
  | 'outstandingBalance'
  | 'maturityDate'
  | 'variableRate'
  | 'fixedRate'
  | 'amortization'
  | 'residualBalance'
  | 'balloonPayment'
  | 'earlyRepayment'
  | 'gracePeriod'
  | 'minimumPayment'
  | 'utilization'
  | 'statementBalance'
  | 'financeCharges'
  | 'murabaha'
  | 'financingAmount'
  | 'profitRate'
  | 'ijara'
  | 'diminishingMusharakah'
  | 'earlySettlement'
  | 'ibra'
  | 'provenance'
  | 'estimate'
  | 'officialValue'
  | 'repricing'
  | 'delinquency'
  | 'dayCount'
  | 'apr'

export const GLOSSARY_TERM_IDS: readonly GlossaryTermId[] = [
  'obligation',
  'principal',
  'interest',
  'interestRate',
  'installment',
  'outstandingBalance',
  'maturityDate',
  'variableRate',
  'fixedRate',
  'amortization',
  'residualBalance',
  'balloonPayment',
  'earlyRepayment',
  'gracePeriod',
  'minimumPayment',
  'utilization',
  'statementBalance',
  'financeCharges',
  'murabaha',
  'financingAmount',
  'profitRate',
  'ijara',
  'diminishingMusharakah',
  'earlySettlement',
  'ibra',
  'provenance',
  'estimate',
  'officialValue',
  'repricing',
  'delinquency',
  'dayCount',
  'apr',
]
