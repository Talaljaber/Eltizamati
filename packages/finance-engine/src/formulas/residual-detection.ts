/**
 * residualDetection.v1 — balloon/residual risk detection
 * (financial-calculation-spec.md §4.3, BR-CALC-012/013).
 *
 * Threshold: residual > max(1% of original principal, 1 × current
 * installment). Causes are reported only from evidence the caller actually
 * has (from the `variableProjection.v1` run that produced the residual) —
 * the engine never asserts a cause it cannot see (e.g. capitalized fees):
 * anything not matched by known evidence falls back to `unknown`, never a
 * fabricated explanation.
 *
 * BR-CALC-013: a contract-designed balloon (`contractualBalloon`, a contract
 * fact) is a distinct concept from a *detected* residual — when present it
 * is reported as its own cause, never folded into "unplanned residual"
 * framing.
 */
import type { Money } from '@eltizamati/domain'
import { type LocalDate } from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { FORMULA_REGISTRY } from '../registry/formula-registry.js'

export type ResidualCause =
  'rateIncreaseWithUnchangedInstallment' | 'paymentShortfall' | 'contractualBalloon' | 'unknown'

export interface ResidualEvidence {
  readonly rateIncreasedWithUnchangedInstallment?: boolean
  readonly contractualBalloon?: Money
  readonly hadNegativeAmortizationFromStart?: boolean
}

export interface ResidualDetectionInputs {
  readonly projectedResidualAtMaturity?: Money
  readonly originalPrincipal?: Money
  readonly currentInstallment?: Money
  readonly evidence?: ResidualEvidence
  readonly asOf: LocalDate
}

export interface ResidualDetectionResult {
  readonly asOf: LocalDate
  readonly hasResidualRisk: boolean
  readonly residual: Money
  readonly threshold: Money
  readonly monthsOfExtraPayments?: number
  readonly causes: readonly ResidualCause[]
}

export function residualDetection(
  inputs: ResidualDetectionInputs,
): EngineOutcome<ResidualDetectionResult> {
  const missing: FieldRef[] = []
  if (inputs.projectedResidualAtMaturity === undefined) {
    missing.push({ field: 'projectedResidualAtMaturity' })
  }
  if (inputs.originalPrincipal === undefined) missing.push({ field: 'originalPrincipal' })
  if (inputs.currentInstallment === undefined) missing.push({ field: 'currentInstallment' })
  if (missing.length > 0) return refused(missing)

  const result = computeResidualDetection(
    inputs.projectedResidualAtMaturity as Money,
    inputs.originalPrincipal as Money,
    inputs.currentInstallment as Money,
    inputs.evidence ?? {},
    inputs.asOf,
  )

  return engineOk(result, 'high', [...FORMULA_REGISTRY.residualDetection.assumptions])
}

export function computeResidualDetection(
  residual: Money,
  originalPrincipal: Money,
  installment: Money,
  evidence: ResidualEvidence,
  asOf: LocalDate,
): ResidualDetectionResult {
  const onePercentPrincipal = originalPrincipal.multiplyBy('0.01')
  const threshold = onePercentPrincipal.isGreaterThan(installment)
    ? onePercentPrincipal
    : installment
  const hasResidualRisk = residual.isGreaterThan(threshold)

  const causes: ResidualCause[] = []
  if (evidence.contractualBalloon !== undefined) causes.push('contractualBalloon')
  if (evidence.rateIncreasedWithUnchangedInstallment === true) {
    causes.push('rateIncreaseWithUnchangedInstallment')
  }
  if (evidence.hadNegativeAmortizationFromStart === true) causes.push('paymentShortfall')
  if (hasResidualRisk && causes.length === 0) causes.push('unknown')

  const monthsOfExtraPayments =
    hasResidualRisk && installment.isPositive()
      ? residual.toDecimal().dividedBy(installment.toDecimal()).ceil().toNumber()
      : undefined

  return {
    asOf,
    hasResidualRisk,
    residual,
    threshold,
    ...(monthsOfExtraPayments !== undefined ? { monthsOfExtraPayments } : {}),
    causes,
  }
}
