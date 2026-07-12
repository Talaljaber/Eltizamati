/**
 * murabahaProgress.v1 — arithmetic-only Murabaha progress
 * (financial-calculation-spec.md §4.8, BR-CALC-020, INV-7).
 *
 * No speculative math is permitted: outstanding = totalSalePrice − Σpayments;
 * progress = Σpayments / totalSalePrice. No repricing, no early-settlement
 * simulation, no imputed rates — exactly the two divisions the spec allows.
 * INV-7: displayed outstanding + Σpayments = totalSalePrice exactly — pure
 * subtraction, no rounding drift is permitted or possible.
 */
import type { Money } from '@eltizamati/domain'
import { Percentage, type LocalDate } from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { FORMULA_REGISTRY } from '../registry/formula-registry.js'

export interface MurabahaProgressInputs {
  readonly totalSalePrice?: Money
  readonly paymentsTotal?: Money
  readonly asOf: LocalDate
}

export interface MurabahaProgressResult {
  readonly asOf: LocalDate
  readonly totalSalePrice: Money
  readonly paidToDate: Money
  readonly outstanding: Money
  readonly progress: Percentage
  readonly status: 'inProgress' | 'completed'
}

export function murabahaProgress(
  inputs: MurabahaProgressInputs,
): EngineOutcome<MurabahaProgressResult> {
  const missing: FieldRef[] = []
  if (inputs.totalSalePrice === undefined) missing.push({ field: 'totalSalePrice' })
  if (inputs.paymentsTotal === undefined) missing.push({ field: 'paymentsTotal' })
  if (missing.length > 0) return refused(missing)

  const result = computeMurabahaProgress(
    inputs.totalSalePrice as Money,
    inputs.paymentsTotal as Money,
    inputs.asOf,
  )

  // 'official' is reserved for values not computed by us at all
  // (PHASE-02-DECISION-LOG §2) — this is engine arithmetic over contract
  // facts, with no CONV-* modeling assumptions (BR-CALC-020 forbids any),
  // so 'high' is the correct ceiling.
  return engineOk(result, 'high', [...FORMULA_REGISTRY.murabahaProgress.assumptions])
}

export function computeMurabahaProgress(
  totalSalePrice: Money,
  paymentsTotal: Money,
  asOf: LocalDate,
): MurabahaProgressResult {
  const outstanding = totalSalePrice.subtract(paymentsTotal)
  const progressFraction = paymentsTotal
    .toDecimal()
    .dividedBy(totalSalePrice.toDecimal())
    .times(100)
  const progress = Percentage.of(progressFraction.toFixed())
  const status: 'inProgress' | 'completed' = outstanding.isPositive() ? 'inProgress' : 'completed'

  return {
    asOf,
    totalSalePrice,
    paidToDate: paymentsTotal,
    outstanding,
    progress,
    status,
  }
}
