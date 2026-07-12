/**
 * allocationEstimate.v1 — principal/cost split estimate for a payment whose
 * official allocation is unknown (financial-calculation-spec.md §4.5,
 * BR-CALC-010).
 *
 * `cost = balanceBefore · i` for the payment's period (the caller resolves
 * which rate period applies — CONV-4's boundary semantics live in
 * `variableProjection.v1`, not duplicated here). `principal = amount − cost`,
 * floored at zero (an estimate never reports negative principal); any
 * excess beyond the outstanding balance becomes an explicit `overpayment`
 * amount rather than an impossible negative balance (INV-1).
 */
import type { Rate } from '@eltizamati/domain'
import { Money, type LocalDate } from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

export interface AllocationEstimateInputs {
  readonly balanceBeforePayment?: Money
  readonly paymentAmount?: Money
  /** The rate active for this payment's period — caller resolves via CONV-4. */
  readonly annualRateForPeriod?: Rate
  readonly asOf: LocalDate
}

export interface AllocationEstimateResult {
  readonly asOf: LocalDate
  readonly cost: Money
  readonly principal: Money
  readonly allocationSource: 'estimated'
  readonly overpayment?: Money
  readonly closingBalance: Money
}

export function allocationEstimate(
  inputs: AllocationEstimateInputs,
): EngineOutcome<AllocationEstimateResult> {
  const missing: FieldRef[] = []
  if (inputs.balanceBeforePayment === undefined) missing.push({ field: 'balanceBeforePayment' })
  if (inputs.paymentAmount === undefined) missing.push({ field: 'paymentAmount' })
  if (inputs.annualRateForPeriod === undefined) missing.push({ field: 'annualRateForPeriod' })
  if (missing.length > 0) return refused(missing)

  const result = computeAllocationEstimate(
    inputs.balanceBeforePayment as Money,
    inputs.paymentAmount as Money,
    inputs.annualRateForPeriod as Rate,
    inputs.asOf,
  )

  return engineOk(result, 'medium', FORMULA_ASSUMPTIONS.allocationEstimate)
}

export function computeAllocationEstimate(
  balanceBeforePayment: Money,
  paymentAmount: Money,
  annualRateForPeriod: Rate,
  asOf: LocalDate,
): AllocationEstimateResult {
  const currency = balanceBeforePayment.currency
  const i = annualRateForPeriod.periodicRate(12)
  const cost = balanceBeforePayment.multiplyBy(i.toString()).round()

  const principalRaw = paymentAmount.subtract(cost)
  let principal = principalRaw.isNegative() ? Money.zero(currency) : principalRaw

  let overpayment: Money | undefined
  let closingBalance: Money
  if (principal.isGreaterThan(balanceBeforePayment)) {
    overpayment = principal.subtract(balanceBeforePayment)
    principal = balanceBeforePayment
    closingBalance = Money.zero(currency)
  } else {
    closingBalance = balanceBeforePayment.subtract(principal)
  }

  return {
    asOf,
    cost,
    principal,
    allocationSource: 'estimated',
    ...(overpayment !== undefined ? { overpayment } : {}),
    closingBalance,
  }
}
