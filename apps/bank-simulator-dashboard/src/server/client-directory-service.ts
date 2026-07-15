/**
 * Client directory rows (docs/dashboard.md §7.B). Projects each allowlisted
 * profile + its obligations into one row; filtering happens over the
 * already-projected rows so every filter option (product type, institution,
 * fixed/variable, active/closed, insight type, completeness, locale) reads
 * from data this module already computed once, not five separate queries.
 */
import {
  resolveMonthlyCommitment,
  isConventionalLoan,
  Money,
  type Insight,
  type LocalDate,
  type Obligation,
  type ObligationKind,
  type UserProfile,
} from '@eltizamati/domain'
import { maskClientName } from './masking'

const CURRENCY = 'JOD'

export type DataCompletenessState = 'complete' | 'incomplete'

export interface ClientDirectoryRow {
  readonly userId: string
  readonly maskedName: string
  readonly locale: 'en' | 'ar'
  readonly primaryBank: string | undefined
  readonly obligationCount: number
  readonly totalKnownMonthlyCommitment: string
  readonly hasVariableRateExposure: boolean
  readonly activeInsightCount: number
  readonly dataCompleteness: DataCompletenessState
  readonly lastUpdated: string
  readonly productKinds: readonly ObligationKind[]
  readonly institutions: readonly string[]
  readonly hasActiveObligation: boolean
  readonly hasClosedObligation: boolean
}

export interface ClientDirectoryFilters {
  readonly productType?: ObligationKind
  readonly institution?: string
  readonly rateExposure?: 'fixed' | 'variable'
  readonly obligationState?: 'active' | 'closed'
  readonly completeness?: DataCompletenessState
  readonly locale?: 'en' | 'ar'
}

function isObligationDataComplete(obligation: Obligation): boolean {
  if (obligation.kind === 'conventionalLoan') {
    return obligation.loanDetails.outstandingBalance !== undefined
  }
  if (obligation.kind === 'creditCard') return true // currentBalance is non-null in the schema
  if (obligation.kind === 'murabaha') return true // no optional material balance field
  return obligation.outstandingBalance !== undefined
}

export function buildClientDirectoryRows(
  profiles: readonly UserProfile[],
  obligations: readonly Obligation[],
  insights: readonly Insight[],
  today: LocalDate,
): readonly ClientDirectoryRow[] {
  return profiles.map((profile) => {
    const own = obligations.filter((o) => o.userId === profile.userId)
    const active = own.filter((o) => o.closedDate === undefined)

    let totalCommitment = Money.zero(CURRENCY)
    for (const o of active) {
      const sourced = resolveMonthlyCommitment(o, today)
      if (sourced !== undefined) totalCommitment = totalCommitment.add(sourced.value)
    }

    const hasVariableRateExposure = active.some(
      (o) => isConventionalLoan(o) && o.loanDetails.rateType === 'variable',
    )

    const ownObligationIds = new Set(own.map((o) => o.id))
    const activeInsightCount = insights.filter(
      (i) =>
        i.userId === profile.userId &&
        i.readAt === undefined &&
        (i.obligationId === undefined || ownObligationIds.has(i.obligationId)),
    ).length

    const dataCompleteness: DataCompletenessState = active.every(isObligationDataComplete)
      ? 'complete'
      : 'incomplete'

    const lastUpdated =
      [profile.updatedAt, ...own.map((o) => o.updatedAt)].sort().at(-1) ?? profile.updatedAt

    return {
      userId: profile.userId,
      maskedName: maskClientName(profile.fullName, profile.userId),
      locale: profile.locale,
      primaryBank: profile.primaryBank,
      obligationCount: own.length,
      totalKnownMonthlyCommitment: totalCommitment.toStorageString(),
      hasVariableRateExposure,
      activeInsightCount,
      dataCompleteness,
      lastUpdated,
      productKinds: [...new Set(own.map((o) => o.kind))],
      institutions: [...new Set(own.map((o) => o.institution.name))],
      hasActiveObligation: active.length > 0,
      hasClosedObligation: own.some((o) => o.closedDate !== undefined),
    }
  })
}

export function filterClientDirectoryRows(
  rows: readonly ClientDirectoryRow[],
  filters: ClientDirectoryFilters,
): readonly ClientDirectoryRow[] {
  return rows.filter((row) => {
    if (filters.productType !== undefined && !row.productKinds.includes(filters.productType)) {
      return false
    }
    if (filters.institution !== undefined && !row.institutions.includes(filters.institution)) {
      return false
    }
    if (filters.rateExposure === 'variable' && !row.hasVariableRateExposure) return false
    if (filters.rateExposure === 'fixed' && row.hasVariableRateExposure) return false
    if (filters.obligationState === 'active' && !row.hasActiveObligation) return false
    if (filters.obligationState === 'closed' && !row.hasClosedObligation) return false
    if (filters.completeness !== undefined && row.dataCompleteness !== filters.completeness) {
      return false
    }
    if (filters.locale !== undefined && row.locale !== filters.locale) return false
    return true
  })
}
