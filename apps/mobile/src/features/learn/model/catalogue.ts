import type { Money, Rate } from '@eltizamati/domain'

export type SourceReviewStatus = 'verified' | 'pending' | 'stale' | 'superseded' | 'unavailable'
export interface SourceRecord {
  readonly id: string
  readonly publisherName: string
  readonly publisherType: 'regulator' | 'bank' | 'government' | 'industry-body'
  readonly title: string
  readonly sourceUrl: string
  readonly language: 'ar' | 'en'
  readonly retrievedAt: string
  readonly publishedAt: string | null
  readonly effectiveFrom: string | null
  readonly effectiveUntil: string | null
  readonly contentHash: string | null
  readonly reviewStatus: SourceReviewStatus
  readonly reviewedBy: string | null
  readonly notes: string | null
}

export interface FinancialInstitution {
  readonly id: string
  readonly nameEn: string
  readonly nameAr: string | null
  readonly institutionType: 'jordanian-bank' | 'foreign-bank-branch' | 'financing-company'
  readonly bankingModel: 'conventional' | 'islamic' | 'mixed'
  readonly website: string
  readonly sourceId: string
  readonly status: 'verified' | 'partially-verified' | 'no-public-product-data-found' | 'pending-review'
  readonly lastReviewedAt: string
}

export type ComparisonPriority =
  | 'lowest-estimated-monthly-payment'
  | 'lowest-estimated-total-cost'
  | 'shorter-term'
  | 'no-salary-transfer'
  | 'islamic-financing-preference'
  | 'lower-published-fees'
  | 'clearer-published-terms'
  | 'early-settlement-flexibility'

export interface FinancingProduct {
  readonly id: string
  readonly institutionId: string
  readonly nameEn: string
  readonly nameAr: string | null
  readonly category: 'personal' | 'vehicle' | 'housing' | 'education' | 'credit-card' | 'other'
  readonly structure: 'conventional-loan' | 'murabaha' | 'ijara' | 'diminishing-musharakah' | 'credit-card' | 'other'
  readonly amountRange: { readonly minimum: Money | null; readonly maximum: Money | null }
  readonly termMonths: { readonly minimum: number | null; readonly maximum: number | null }
  readonly pricing: {
    readonly kind: 'fixed-interest' | 'variable-interest' | 'profit-rate' | 'advertised-from' | 'not-published'
    readonly minimumAnnualRate: Rate | null
    readonly maximumAnnualRate: Rate | null
    readonly benchmarkName: string | null
    readonly margin: string | null
    readonly effectiveRatePublished: Rate | null
  }
  readonly salaryTransfer: 'required' | 'not-required' | 'optional' | 'not-published'
  readonly earlySettlementText: string | null
  readonly sourceIds: readonly string[]
  readonly lastVerifiedAt: string
  readonly completeness: 'complete-published-fields' | 'partial' | 'minimal'
  readonly status: 'active' | 'possibly-stale' | 'withdrawn' | 'pending-review'
}

export interface FinancingSearchRequest {
  readonly purpose: FinancingProduct['category']
  readonly structurePreference: 'conventional' | 'islamic' | 'either'
  readonly salaryTransferPreference: 'acceptable' | 'avoid' | 'required' | 'no-preference'
  readonly priorities: readonly ComparisonPriority[]
}

export interface ProductComparisonResult {
  readonly product: FinancingProduct
  readonly eligibilityState: 'passes-published-rules' | 'fails-published-rule' | 'unknown'
  readonly matchedPreferences: readonly string[]
  readonly conflicts: readonly string[]
  readonly unknowns: readonly string[]
  readonly sourceIds: readonly string[]
  readonly freshnessState: 'current' | 'review-required' | 'stale'
}
