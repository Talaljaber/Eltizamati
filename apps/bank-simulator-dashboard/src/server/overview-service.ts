/**
 * Overview aggregates (docs/dashboard.md §7.A). Reuses
 * `@eltizamati/finance-engine`'s `aggregates.v1` for the totals — this
 * module's own job is purely to project `Obligation[]`/`Insight[]` into
 * that formula's inputs and to add the counts/labels the spec asks for
 * that aren't `aggregates.v1`'s concern (client count, per-kind counts,
 * fixed/variable exposure, upcoming maturities, insight-derived counts).
 *
 * BR-PROV-005: nothing here treats a missing value as zero — every
 * exclusion is counted and named, never silently dropped.
 */
import {
  daysBetweenLocalDates,
  extractOfficialBalance,
  isCreditCard,
  resolveMonthlyCommitment,
  Money,
  type Insight,
  type LocalDate,
  type Obligation,
} from '@eltizamati/domain'
import {
  computeAggregates,
  type ObligationBalanceItem,
  type ObligationCommitmentItem,
} from '@eltizamati/finance-engine'
import { classifyDataQuality, type DataQualityLabel } from './data-quality'

const UPCOMING_MATURITY_HORIZON_DAYS = 90
/** FR-INS-001: a card is high-utilization above 70% of its limit. */
const HIGH_UTILIZATION_THRESHOLD = 0.7
const CURRENCY = 'JOD'

export interface AggregateFigure {
  readonly amount: Money
  readonly quality: DataQualityLabel | undefined
  readonly excludedCount: number
}

export interface UpcomingMaturity {
  readonly obligationId: string
  readonly nickname: string
  readonly maturityDate: LocalDate
}

export interface HighUtilizationCard {
  readonly obligationId: string
  readonly nickname: string
  readonly utilizationPercent: number
}

export interface OverviewStats {
  readonly totalClients: number
  readonly activeObligations: number
  readonly conventionalLoans: number
  readonly murabahaAgreements: number
  readonly creditCards: number
  readonly totalOutstanding: AggregateFigure
  readonly totalMonthlyCommitment: AggregateFigure
  readonly fixedRateExposure: { readonly amount: Money; readonly loanCount: number }
  readonly variableRateExposure: { readonly amount: Money; readonly loanCount: number }
  readonly otherRateTypeLoanCount: number
  readonly upcomingMaturities: readonly UpcomingMaturity[]
  readonly activeResidualRiskInsights: number
  readonly highUtilizationCards: readonly HighUtilizationCard[]
  readonly incompleteDataCount: number
}

function toBalanceItem(obligation: Obligation): ObligationBalanceItem {
  const sourced = extractOfficialBalance(obligation)
  return {
    obligationId: obligation.id,
    nickname: obligation.nickname,
    balance: sourced?.value,
    isEstimate: sourced?.provenance.source === 'estimate',
  }
}

function toCommitmentItem(obligation: Obligation, today: LocalDate): ObligationCommitmentItem {
  const sourced = resolveMonthlyCommitment(obligation, today)
  return {
    obligationId: obligation.id,
    nickname: obligation.nickname,
    monthlyCommitment: sourced?.value,
    isEstimate: sourced?.provenance.source === 'estimate',
  }
}

export function computeOverviewStats(
  clientCount: number,
  obligations: readonly Obligation[],
  insights: readonly Insight[],
  today: LocalDate,
): OverviewStats {
  const activeObligations = obligations.filter((o) => o.closedDate === undefined)

  const balanceItems = activeObligations.map((o) => toBalanceItem(o))
  const commitmentItems = activeObligations.map((o) => toCommitmentItem(o, today))
  const aggregate = computeAggregates(balanceItems, commitmentItems, CURRENCY, today)

  const balanceSources = activeObligations
    .map((o) => extractOfficialBalance(o)?.provenance.source)
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
  const commitmentSources = activeObligations
    .map((o) => resolveMonthlyCommitment(o, today)?.provenance.source)
    .filter((s): s is NonNullable<typeof s> => s !== undefined)

  const loans = activeObligations.filter((o) => o.kind === 'conventionalLoan')
  let fixedAmount = Money.zero(CURRENCY)
  let fixedCount = 0
  let variableAmount = Money.zero(CURRENCY)
  let variableCount = 0
  let otherRateTypeCount = 0
  for (const loan of loans) {
    const balance = loan.loanDetails.outstandingBalance?.value
    if (loan.loanDetails.rateType === 'fixed') {
      fixedCount++
      if (balance !== undefined) fixedAmount = fixedAmount.add(balance)
    } else if (loan.loanDetails.rateType === 'variable') {
      variableCount++
      if (balance !== undefined) variableAmount = variableAmount.add(balance)
    } else {
      otherRateTypeCount++
    }
  }

  const upcomingMaturities: UpcomingMaturity[] = loans
    .filter((loan) => {
      const days = daysBetweenLocalDates(today, loan.loanDetails.maturityDate)
      return days >= 0 && days <= UPCOMING_MATURITY_HORIZON_DAYS
    })
    .map((loan) => ({
      obligationId: loan.id,
      nickname: loan.nickname,
      maturityDate: loan.loanDetails.maturityDate,
    }))

  const activeResidualRiskInsights = insights.filter(
    (i) => i.ruleId === 'RESIDUAL_RISK' && i.readAt === undefined,
  ).length

  const highUtilizationCards: HighUtilizationCard[] = activeObligations
    .filter(isCreditCard)
    .flatMap((card): HighUtilizationCard[] => {
      const { creditLimit, currentBalance } = card.cardDetails
      if (!creditLimit.value.isPositive()) return []
      const ratio = currentBalance.value.toDecimal().dividedBy(creditLimit.value.toDecimal())
      if (ratio.toNumber() <= HIGH_UTILIZATION_THRESHOLD) return []
      return [
        {
          obligationId: card.id,
          nickname: card.nickname,
          utilizationPercent: ratio.times(100).toDecimalPlaces(1).toNumber(),
        },
      ]
    })

  const incompleteObligationIds = new Set([
    ...aggregate.excludedFromOutstanding.map((x) => x.obligationId),
    ...aggregate.excludedFromCommitment.map((x) => x.obligationId),
  ])

  return {
    totalClients: clientCount,
    activeObligations: activeObligations.length,
    conventionalLoans: activeObligations.filter((o) => o.kind === 'conventionalLoan').length,
    murabahaAgreements: activeObligations.filter((o) => o.kind === 'murabaha').length,
    creditCards: activeObligations.filter((o) => o.kind === 'creditCard').length,
    totalOutstanding: {
      amount: aggregate.totalOutstanding,
      quality: classifyDataQuality(balanceSources),
      excludedCount: aggregate.excludedFromOutstanding.length,
    },
    totalMonthlyCommitment: {
      amount: aggregate.totalMonthlyCommitment,
      quality: classifyDataQuality(commitmentSources),
      excludedCount: aggregate.excludedFromCommitment.length,
    },
    fixedRateExposure: { amount: fixedAmount, loanCount: fixedCount },
    variableRateExposure: { amount: variableAmount, loanCount: variableCount },
    otherRateTypeLoanCount: otherRateTypeCount,
    upcomingMaturities,
    activeResidualRiskInsights,
    highUtilizationCards,
    incompleteDataCount: incompleteObligationIds.size,
  }
}
