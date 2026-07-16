/**
 * Portfolio analytics (docs/dashboard.md §7.D, Phase 5). Every distribution
 * here is computed from the allowlisted `Obligation[]`/`Insight[]`/outbox
 * rows already loaded elsewhere — no new query shape, no new formula. Each
 * bucket carries a count and (where the field is monetary) a `Money` total,
 * so the page can render both a table and a restrained bar next to it.
 */
import {
  extractOfficialBalance,
  isConventionalLoan,
  Money,
  type Insight,
  type LocalDate,
  type Obligation,
  type ObligationKind,
} from '@eltizamati/domain'
import { classifyDataQuality, type DataQualityLabel } from './data-quality'
import { isObligationDataComplete } from './client-directory-service'
import type { EmailOutboxRow } from './repositories/demo-email-outbox-repository'

const CURRENCY = 'JOD'

export interface CountedAmount {
  readonly label: string
  readonly count: number
  readonly amount: Money
}

export interface Counted {
  readonly label: string
  readonly count: number
}

export interface PortfolioAnalytics {
  readonly byKind: readonly CountedAmount[]
  readonly balanceBuckets: readonly CountedAmount[]
  readonly rateTypeDistribution: readonly CountedAmount[]
  readonly maturityTimeline: readonly Counted[]
  readonly rateBuckets: readonly Counted[]
  readonly insightSeverityDistribution: readonly Counted[]
  readonly provenanceDistribution: readonly Counted[]
  readonly completenessDistribution: readonly Counted[]
  readonly deliveryStatusDistribution: readonly Counted[]
}

const KIND_LABEL: Record<ObligationKind, string> = {
  conventionalLoan: 'Conventional loan',
  murabaha: 'Murabaha',
  ijara: 'Ijara',
  diminishingMusharakah: 'Diminishing Musharakah',
  creditCard: 'Credit card',
  genericFacility: 'Other facility',
}

const BALANCE_BUCKET_UPPER_BOUNDS = [1_000, 5_000, 10_000, 25_000, 50_000] as const

function balanceBucketLabel(index: number): string {
  const lower = index === 0 ? 0 : BALANCE_BUCKET_UPPER_BOUNDS[index - 1]
  const upper = BALANCE_BUCKET_UPPER_BOUNDS[index]
  if (upper === undefined) return `Above ${lower}`
  return `${lower} – ${upper}`
}

function balanceBucketIndex(amount: number): number {
  const index = BALANCE_BUCKET_UPPER_BOUNDS.findIndex((upper) => amount < upper)
  return index === -1 ? BALANCE_BUCKET_UPPER_BOUNDS.length : index
}

const RATE_BUCKET_UPPER_BOUNDS = [3, 5, 7, 10] as const

function rateBucketLabel(index: number): string {
  const lower = index === 0 ? 0 : RATE_BUCKET_UPPER_BOUNDS[index - 1]
  const upper = RATE_BUCKET_UPPER_BOUNDS[index]
  if (upper === undefined) return `Above ${lower}%`
  return `${lower}–${upper}%`
}

function rateBucketIndex(percent: number): number {
  const index = RATE_BUCKET_UPPER_BOUNDS.findIndex((upper) => percent < upper)
  return index === -1 ? RATE_BUCKET_UPPER_BOUNDS.length : index
}

function currentActiveRatePercent(obligation: Obligation): number | undefined {
  if (!isConventionalLoan(obligation)) return undefined
  const active = obligation.loanDetails.ratePeriods.filter((p) => p.supersededBy === undefined)
  if (active.length === 0) return undefined
  const latest = [...active].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]
  return latest?.annualRate.toDecimal().times(100).toNumber()
}

function maturityYearQuarter(date: LocalDate): string {
  const [year, month] = date.split('-')
  const quarter = Math.floor((Number(month) - 1) / 3) + 1
  return `${year} Q${quarter}`
}

export function computePortfolioAnalytics(
  obligations: readonly Obligation[],
  insights: readonly Insight[],
  emailOutbox: readonly EmailOutboxRow[],
): PortfolioAnalytics {
  const active = obligations.filter((o) => o.closedDate === undefined)

  // By kind
  const byKindMap = new Map<ObligationKind, { count: number; amount: Money }>()
  for (const o of active) {
    const existing = byKindMap.get(o.kind) ?? { count: 0, amount: Money.zero(CURRENCY) }
    const balance = extractOfficialBalance(o)?.value
    byKindMap.set(o.kind, {
      count: existing.count + 1,
      amount: balance !== undefined ? existing.amount.add(balance) : existing.amount,
    })
  }
  const byKind: CountedAmount[] = [...byKindMap.entries()].map(([kind, v]) => ({
    label: KIND_LABEL[kind],
    count: v.count,
    amount: v.amount,
  }))

  // Balance buckets
  const balanceBucketTotals = BALANCE_BUCKET_UPPER_BOUNDS.map(() => ({
    count: 0,
    amount: Money.zero(CURRENCY),
  }))
  balanceBucketTotals.push({ count: 0, amount: Money.zero(CURRENCY) })
  let balanceExcludedCount = 0
  for (const o of active) {
    const sourced = extractOfficialBalance(o)
    if (sourced === undefined) {
      balanceExcludedCount++
      continue
    }
    const index = balanceBucketIndex(sourced.value.toDecimal().toNumber())
    const bucket = balanceBucketTotals[index]
    if (bucket !== undefined) {
      balanceBucketTotals[index] = { count: bucket.count + 1, amount: bucket.amount.add(sourced.value) }
    }
  }
  const balanceBuckets: CountedAmount[] = balanceBucketTotals.map((v, i) => ({
    label: balanceBucketLabel(i),
    count: v.count,
    amount: v.amount,
  }))
  if (balanceExcludedCount > 0) {
    balanceBuckets.push({
      label: 'Balance unknown',
      count: balanceExcludedCount,
      amount: Money.zero(CURRENCY),
    })
  }

  // Fixed vs variable
  const loans = active.filter(isConventionalLoan)
  let fixedCount = 0
  let fixedAmount = Money.zero(CURRENCY)
  let variableCount = 0
  let variableAmount = Money.zero(CURRENCY)
  let otherCount = 0
  let otherAmount = Money.zero(CURRENCY)
  for (const loan of loans) {
    const balance = loan.loanDetails.outstandingBalance?.value
    if (loan.loanDetails.rateType === 'fixed') {
      fixedCount++
      if (balance !== undefined) fixedAmount = fixedAmount.add(balance)
    } else if (loan.loanDetails.rateType === 'variable') {
      variableCount++
      if (balance !== undefined) variableAmount = variableAmount.add(balance)
    } else {
      otherCount++
      if (balance !== undefined) otherAmount = otherAmount.add(balance)
    }
  }
  const rateTypeDistribution: CountedAmount[] = [
    { label: 'Fixed', count: fixedCount, amount: fixedAmount },
    { label: 'Variable', count: variableCount, amount: variableAmount },
    { label: 'Mixed/unknown', count: otherCount, amount: otherAmount },
  ]

  // Maturity timeline
  const maturityMap = new Map<string, number>()
  for (const loan of loans) {
    const key = maturityYearQuarter(loan.loanDetails.maturityDate)
    maturityMap.set(key, (maturityMap.get(key) ?? 0) + 1)
  }
  const maturityTimeline: Counted[] = [...maturityMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([label, count]) => ({ label, count }))

  // Rate buckets
  const rateBucketCounts = new Array(RATE_BUCKET_UPPER_BOUNDS.length + 1).fill(0)
  let rateUnknownCount = 0
  for (const loan of loans) {
    const percent = currentActiveRatePercent(loan)
    if (percent === undefined) {
      rateUnknownCount++
      continue
    }
    const index = rateBucketIndex(percent)
    rateBucketCounts[index] = (rateBucketCounts[index] ?? 0) + 1
  }
  const rateBuckets: Counted[] = rateBucketCounts.map((count, i) => ({
    label: rateBucketLabel(i),
    count,
  }))
  if (rateUnknownCount > 0) rateBuckets.push({ label: 'Rate unknown', count: rateUnknownCount })

  // Insight severity distribution (active/unread only)
  const activeInsights = insights.filter((i) => i.readAt === undefined)
  const severityMap = new Map<string, number>()
  for (const insight of activeInsights) {
    severityMap.set(insight.severity, (severityMap.get(insight.severity) ?? 0) + 1)
  }
  const insightSeverityDistribution: Counted[] = [...severityMap.entries()].map(
    ([label, count]) => ({ label, count }),
  )

  // Provenance distribution (based on each obligation's balance source)
  const provenanceMap = new Map<DataQualityLabel | 'unknown', number>()
  for (const o of active) {
    const source = extractOfficialBalance(o)?.provenance.source
    const label = source === undefined ? 'unknown' : (classifyDataQuality([source]) ?? 'unknown')
    provenanceMap.set(label, (provenanceMap.get(label) ?? 0) + 1)
  }
  const provenanceDistribution: Counted[] = [...provenanceMap.entries()].map(([label, count]) => ({
    label,
    count,
  }))

  // Incomplete-data distribution
  const completeCount = active.filter(isObligationDataComplete).length
  const completenessDistribution: Counted[] = [
    { label: 'Complete', count: completeCount },
    { label: 'Incomplete', count: active.length - completeCount },
  ]

  // Delivery status distribution
  const deliveryMap = new Map<string, number>()
  for (const row of emailOutbox) {
    deliveryMap.set(row.status, (deliveryMap.get(row.status) ?? 0) + 1)
  }
  const deliveryStatusDistribution: Counted[] = [...deliveryMap.entries()].map(([label, count]) => ({
    label,
    count,
  }))

  return {
    byKind,
    balanceBuckets,
    rateTypeDistribution,
    maturityTimeline,
    rateBuckets,
    insightSeverityDistribution,
    provenanceDistribution,
    completenessDistribution,
    deliveryStatusDistribution,
  }
}
