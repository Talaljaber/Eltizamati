import { Money, type LocalDate, type RatePeriod } from '@eltizamati/domain'
import type { CanonicalJsonValue } from '@eltizamati/domain'
import { snapshotArray, snapshotMoneyAmount, snapshotRecord } from '@/services/calculation-snapshot'

export function rateHistoryFingerprint(periods: readonly RatePeriod[] | undefined): string {
  if (periods === undefined) return 'loading'
  return [...periods]
    .sort((a, b) =>
      a.effectiveFrom === b.effectiveFrom
        ? a.id.localeCompare(b.id)
        : a.effectiveFrom.localeCompare(b.effectiveFrom),
    )
    .map(
      (period) =>
        `${period.id}:${period.effectiveFrom}:${period.annualRate.toStorageString()}:${period.supersededBy ?? ''}`,
    )
    .join('|')
}

export function applicableRatePeriods(
  periods: readonly RatePeriod[] | undefined,
  asOf: LocalDate,
): readonly RatePeriod[] {
  return [...(periods ?? [])]
    .filter((period) => period.supersededBy === undefined && period.effectiveFrom <= asOf)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
}

/** Scheduled payments still due after asOf plus any projected maturity residual. */
export function projectedRemainingPayable(
  snapshot: Record<string, CanonicalJsonValue>,
  currency: string,
  asOf: LocalDate,
): Money | undefined {
  let total = Money.zero(currency)
  for (const value of snapshotArray(snapshot.schedule)) {
    const entry = snapshotRecord(value)
    if (typeof entry.date !== 'string' || entry.date <= asOf) continue
    const payment = snapshotMoneyAmount(entry.payment)
    if (payment === undefined) return undefined
    total = total.add(Money.of(payment, currency))
  }

  const residual = snapshotMoneyAmount(snapshot.projectedResidualAtMaturity)
  return residual === undefined ? undefined : total.add(Money.of(residual, currency))
}
