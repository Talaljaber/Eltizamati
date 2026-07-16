/**
 * Benchmark Simulator impact preview (docs/dashboard.md §7.F, Phase 5).
 *
 * A simulated Central Bank benchmark change is recorded as its own
 * standalone fact — it never auto-updates a single contract. This service
 * only ever classifies obligations into three buckets; it never computes a
 * new rate or a new payment for any of them, because the data needed to do
 * that honestly does not exist in this schema:
 *
 *   - No benchmark identity/reference is stored per loan (no column ties a
 *     `loan_details` row to a named benchmark).
 *   - No margin/spread, repricing frequency, floor, cap, or next-repricing
 *     date is stored anywhere.
 *
 * So every variable-rate conventional loan is, at most, "potentially
 * affected" (its rate type suggests it moves with *some* benchmark), and
 * every one of them is *also* "missing benchmark/margin info" — both
 * buckets overlap completely today. This is stated explicitly rather than
 * guessed at, per docs/dashboard.md's "never invent data" rule.
 */
import { isConventionalLoan, type Obligation } from '@eltizamati/domain'

export interface PotentiallyAffectedLoan {
  readonly obligationId: string
  readonly userId: string
  readonly nickname: string
  readonly institution: string
}

export interface BenchmarkImpactSummary {
  readonly potentiallyAffected: readonly PotentiallyAffectedLoan[]
  readonly missingBenchmarkInfoCount: number
  readonly contractImpactCalculable: false
  readonly contractImpactMessage: string
}

const CONTRACT_IMPACT_MESSAGE =
  'Contract impact cannot be calculated from the available data: this schema does not store a ' +
  'benchmark reference, margin/spread, repricing frequency, floor, or cap for any loan. A ' +
  'benchmark change is recorded here as a simulated market event only — it never updates a ' +
  'borrower contract automatically.'

export function computeBenchmarkImpact(obligations: readonly Obligation[]): BenchmarkImpactSummary {
  const potentiallyAffected: PotentiallyAffectedLoan[] = []

  for (const obligation of obligations) {
    if (!isConventionalLoan(obligation)) continue
    if (obligation.closedDate !== undefined) continue
    if (obligation.loanDetails.rateType !== 'variable') continue

    potentiallyAffected.push({
      obligationId: obligation.id,
      userId: obligation.userId,
      nickname: obligation.nickname,
      institution: obligation.institution.name,
    })
  }

  return {
    potentiallyAffected,
    // Every potentially-affected loan is also missing benchmark/margin
    // info, because the schema has nowhere to store it for any loan.
    missingBenchmarkInfoCount: potentiallyAffected.length,
    contractImpactCalculable: false,
    contractImpactMessage: CONTRACT_IMPACT_MESSAGE,
  }
}
