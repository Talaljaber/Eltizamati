import type { Money } from '@eltizamati/domain'

export type ScheduleStalenessReason = 'rateChanged' | 'paymentDrift' | 'balloon'

export interface ScheduleStalenessInput {
  readonly paymentsTotal: Money
  /** What the schedule says should have been paid by `asOf` — undefined when unknown. */
  readonly expectedPaidByAsOf: Money | undefined
  readonly installment: Money
  readonly rateDrifted: boolean
  readonly balloonPositive: boolean
}

export interface ScheduleStaleness {
  readonly stale: boolean
  readonly reasons: readonly ScheduleStalenessReason[]
}

/**
 * A logged payment or a bank rate change can leave the agreed schedule no
 * longer matching reality. Drifting from the expected paid-to-date by more
 * than one installment (over or under) is treated as materially stale —
 * anything smaller is normal rounding, not a signal to re-propose.
 */
export function computeScheduleStaleness(input: ScheduleStalenessInput): ScheduleStaleness {
  const reasons: ScheduleStalenessReason[] = []
  if (input.rateDrifted) reasons.push('rateChanged')
  if (input.balloonPositive) reasons.push('balloon')
  if (
    input.expectedPaidByAsOf !== undefined &&
    input.installment.isPositive() &&
    input.paymentsTotal.subtract(input.expectedPaidByAsOf).abs().isGreaterThan(input.installment)
  ) {
    reasons.push('paymentDrift')
  }
  return { stale: reasons.length > 0, reasons }
}
