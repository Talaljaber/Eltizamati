/**
 * A SYNTHETIC decision-support indicator for the loan-application review
 * queue. This is deliberately NOT a credit score and NOT a bureau pull —
 * the project has no CRIF/bureau integration and must never invent one
 * (docs/dashboard.md §4: never invent salary/credit-score/approval-score
 * data). It is a crude, transparent ratio of the requested monthly burden
 * to the applicant's already-known monthly commitments, bucketed into three
 * bands purely to give the human reviewer a starting glance. It is never
 * persisted and is always rendered with an explicit "synthetic demo
 * indicator, not a real credit bureau score" disclaimer. The admin makes the
 * actual decision.
 */
export type DemoRiskBand = 'low' | 'medium' | 'high'

export interface DemoRiskInput {
  /** Requested loan principal (JOD). */
  readonly requestedAmount: number
  readonly requestedTermMonths: number
  /** The applicant's current total known monthly commitment across existing obligations (JOD). */
  readonly existingMonthlyCommitment: number
}

export interface DemoRiskIndicator {
  readonly band: DemoRiskBand
  /**
   * Estimated new monthly burden as a multiple of existing commitments
   * (rounded to 2dp). Shown alongside the band so the reviewer sees the
   * crude basis, never a hidden black-box number.
   */
  readonly burdenRatio: number
  readonly estimatedMonthlyPayment: number
}

/**
 * A zero-interest straight-line estimate of the monthly payment — this is a
 * glance aid, not the real amortized installment (that is computed properly
 * on approval), so it deliberately avoids implying a precise figure.
 */
function estimateMonthlyPayment(amount: number, termMonths: number): number {
  if (termMonths <= 0) return amount
  return amount / termMonths
}

export function computeDemoRiskIndicator(input: DemoRiskInput): DemoRiskIndicator {
  const estimatedMonthlyPayment = estimateMonthlyPayment(
    input.requestedAmount,
    input.requestedTermMonths,
  )

  // If there are no existing commitments, the ratio is undefined — treat any
  // positive new burden as the middle band rather than dividing by zero or
  // pretending it's risk-free.
  const burdenRatio =
    input.existingMonthlyCommitment > 0
      ? Math.round((estimatedMonthlyPayment / input.existingMonthlyCommitment) * 100) / 100
      : 0

  let band: DemoRiskBand
  if (input.existingMonthlyCommitment <= 0) {
    band = 'medium'
  } else if (burdenRatio <= 0.5) {
    band = 'low'
  } else if (burdenRatio <= 1.5) {
    band = 'medium'
  } else {
    band = 'high'
  }

  return {
    band,
    burdenRatio,
    estimatedMonthlyPayment: Math.round(estimatedMonthlyPayment * 1000) / 1000,
  }
}
