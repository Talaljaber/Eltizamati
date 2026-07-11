/**
 * Named thresholds referenced across domain services — domain-model.md §4:
 * "All thresholds are named constants in domain/src/constants.ts (no magic
 * numbers), each with a CONV- id."
 *
 * Do not inline any of these values at call sites. Changing a value here is
 * a business-rule change and must cite the same rule id in its commit/PR.
 */
import { Money } from './value-objects/money.js'

/** CONV-5: rounding tolerance for validation checks, per period (financial-calculation-spec.md §2). */
export function conv5PerPeriodTolerance(currency = 'JOD'): Money {
  return Money.of('0.005', currency)
}

/** CONV-5: rounding tolerance for validation checks, per whole schedule. */
export function conv5PerScheduleTolerance(currency = 'JOD'): Money {
  return Money.of('0.5', currency)
}

/** CONV-6: overdue grace window in days after the due date before `overdue` fires. */
export const CONV_6_OVERDUE_GRACE_DAYS = 3

/** CONV-7: "due soon" horizon in days. */
export const CONV_7_DUE_SOON_HORIZON_DAYS = 7

/** BR-STAT-003: consecutive unpaid due periods that constitute delinquency. */
export const BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS = 2

/**
 * Insight rule id reserved for signaling an engine refusal (BR-CALC-016) into
 * `deriveObligationStatus`'s `calculationIncomplete` step. `domain-model.md`'s
 * documented 4-argument status-derivation signature has no `CalculationRun`
 * parameter, so refusal must be observable via the `insights` argument instead
 * — an application service raises this insight when a `CalculationRun`
 * refuses. See PHASE-02-DECISION-LOG.md §13.
 */
export const CALCULATION_REFUSED_INSIGHT_RULE_ID = 'system.calculationRefused'
