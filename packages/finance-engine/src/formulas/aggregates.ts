/**
 * aggregates.v1 — total outstanding + total monthly commitment across
 * obligations (financial-calculation-spec.md §4.7, FR-CALC-006).
 *
 * Takes pre-resolved "best-available" figures per obligation rather than raw
 * `Obligation` entities: resolving *which* balance is best-available for a
 * given obligation kind is per-kind projection work already owned by
 * `variableProjection.v1`/`murabahaProgress.v1`/the card's own official
 * balance — aggregates.v1's job is purely to sum and label what it's given.
 *
 * BR-PROV-005: obligations lacking any balance are excluded from the sum and
 * named, never silently dropped. BR-PROV-004: if any included figure is an
 * estimate, the whole aggregate is labeled `includesEstimates`.
 */
import { Money, type LocalDate } from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

export interface ExcludedObligation {
  readonly obligationId: string
  readonly nickname: string
}

export interface ObligationBalanceItem {
  readonly obligationId: string
  readonly nickname: string
  /** undefined ⇒ excluded from the sum (BR-PROV-005) — no balance is known at all. */
  readonly balance?: Money
  readonly isEstimate: boolean
}

export interface ObligationCommitmentItem {
  readonly obligationId: string
  readonly nickname: string
  readonly monthlyCommitment?: Money
  readonly isEstimate: boolean
}

export interface AggregatesInputs {
  readonly balances?: readonly ObligationBalanceItem[]
  readonly commitments?: readonly ObligationCommitmentItem[]
  readonly currency?: string
  readonly asOf: LocalDate
}

export interface AggregatesResult {
  readonly asOf: LocalDate
  readonly currency: string
  readonly totalOutstanding: Money
  readonly totalMonthlyCommitment: Money
  readonly includesEstimates: boolean
  readonly excludedFromOutstanding: readonly ExcludedObligation[]
  readonly excludedFromCommitment: readonly ExcludedObligation[]
}

export function aggregates(inputs: AggregatesInputs): EngineOutcome<AggregatesResult> {
  const missing: FieldRef[] = []
  if (inputs.balances === undefined) missing.push({ field: 'balances' })
  if (inputs.commitments === undefined) missing.push({ field: 'commitments' })
  if (inputs.currency === undefined) missing.push({ field: 'currency' })
  if (missing.length > 0) return refused(missing)

  const result = computeAggregates(
    inputs.balances as readonly ObligationBalanceItem[],
    inputs.commitments as readonly ObligationCommitmentItem[],
    inputs.currency as string,
    inputs.asOf,
  )

  return engineOk(result, 'high', FORMULA_ASSUMPTIONS.aggregates)
}

export function computeAggregates(
  balances: readonly ObligationBalanceItem[],
  commitments: readonly ObligationCommitmentItem[],
  currency: string,
  asOf: LocalDate,
): AggregatesResult {
  let totalOutstanding = Money.zero(currency)
  let includesEstimates = false
  const excludedFromOutstanding: ExcludedObligation[] = []

  for (const item of balances) {
    if (item.balance === undefined) {
      excludedFromOutstanding.push({ obligationId: item.obligationId, nickname: item.nickname })
      continue
    }
    totalOutstanding = totalOutstanding.add(item.balance)
    if (item.isEstimate) includesEstimates = true
  }

  let totalMonthlyCommitment = Money.zero(currency)
  const excludedFromCommitment: ExcludedObligation[] = []

  for (const item of commitments) {
    if (item.monthlyCommitment === undefined) {
      excludedFromCommitment.push({ obligationId: item.obligationId, nickname: item.nickname })
      continue
    }
    totalMonthlyCommitment = totalMonthlyCommitment.add(item.monthlyCommitment)
    if (item.isEstimate) includesEstimates = true
  }

  return {
    asOf,
    currency,
    totalOutstanding,
    totalMonthlyCommitment,
    includesEstimates,
    excludedFromOutstanding,
    excludedFromCommitment,
  }
}
