/**
 * addedCostFromRepricing.v1 — TV-305 (calculation-test-vectors.md §TV-3xx,
 * financial-calculation-spec.md §4.2).
 *
 * Estimates how much more interest a loan will cost, over its full
 * projected life, purely because of the rate change(s) actually on file —
 * by comparing the real-rate-history projection against a counterfactual
 * projection that holds the loan's original (first) rate constant for the
 * whole term. Both projections use the same `installment: unchanged` policy
 * the rest of this screen already uses, so the comparison isolates the rate
 * effect specifically; it is not affected by the residual balloon (reported
 * separately by residualDetection.v1).
 *
 * This mirrors the exact comparison TV-305 already asserts structurally in
 * demo-seed-vectors.test.ts (actual totals.totalCost vs a single-rate-period
 * hypothetical). Per calculation-test-vectors.md's integrity rule, this
 * engine is never the source of its own "expected" value — TV-305's exact
 * figure remains PENDING-FINANCE until a finance teammate signs off an
 * independently-computed number, so this formula reports at 'medium'
 * confidence, never 'official'.
 */
import { Money, type LocalDate, type Rate, type RatePeriod } from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { computeVariableProjection } from './variable-projection.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

export interface AddedCostFromRepricingInputs {
  readonly principal?: Money
  /** Non-superseded rate history, any order. */
  readonly ratePeriods?: readonly RatePeriod[]
  readonly termMonths?: number
  readonly startDate?: LocalDate
  readonly installment?: Money
  readonly asOf: LocalDate
}

export interface AddedCostFromRepricingResult {
  readonly hasReprice: boolean
  readonly originalRate: Rate
  readonly addedTotalCost: Money
  readonly actualTotalCost: Money
  readonly hypotheticalTotalCost: Money
}

export function addedCostFromRepricing(
  inputs: AddedCostFromRepricingInputs,
): EngineOutcome<AddedCostFromRepricingResult> {
  const missing: FieldRef[] = []
  if (inputs.principal === undefined) missing.push({ field: 'principal' })
  if (inputs.ratePeriods === undefined || inputs.ratePeriods.length === 0) {
    missing.push({ field: 'ratePeriods' })
  }
  if (inputs.termMonths === undefined) missing.push({ field: 'termMonths' })
  if (inputs.startDate === undefined) missing.push({ field: 'startDate' })
  if (inputs.installment === undefined) missing.push({ field: 'installment' })
  if (missing.length > 0) return refused(missing)

  const principal = inputs.principal as Money
  const ratePeriods = inputs.ratePeriods as readonly RatePeriod[]
  const termMonths = inputs.termMonths as number
  const startDate = inputs.startDate as LocalDate
  const installment = inputs.installment as Money

  const active = [...ratePeriods]
    .filter((p) => p.supersededBy === undefined)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
  const originalPeriod = active[0]
  if (originalPeriod === undefined) {
    return refused([{ field: 'ratePeriods', reason: 'noActiveRate' }])
  }

  // No rate change on file yet — added cost is genuinely zero, not
  // "unavailable"; avoids a spurious refusal on a brand-new loan.
  if (active.length === 1) {
    const zero = Money.zero(principal.currency)
    return engineOk(
      {
        hasReprice: false,
        originalRate: originalPeriod.annualRate,
        addedTotalCost: zero,
        actualTotalCost: zero,
        hypotheticalTotalCost: zero,
      },
      'medium',
      FORMULA_ASSUMPTIONS.addedCostFromRepricing,
    )
  }

  const actual = computeVariableProjection(
    principal,
    ratePeriods,
    termMonths,
    startDate,
    installment,
    { kind: 'unchanged' },
    inputs.asOf,
  )
  const hypothetical = computeVariableProjection(
    principal,
    [originalPeriod],
    termMonths,
    startDate,
    installment,
    { kind: 'unchanged' },
    inputs.asOf,
  )

  return engineOk(
    {
      hasReprice: true,
      originalRate: originalPeriod.annualRate,
      addedTotalCost: actual.totals.totalCost.subtract(hypothetical.totals.totalCost),
      actualTotalCost: actual.totals.totalCost,
      hypotheticalTotalCost: hypothetical.totals.totalCost,
    },
    'medium',
    FORMULA_ASSUMPTIONS.addedCostFromRepricing,
  )
}
