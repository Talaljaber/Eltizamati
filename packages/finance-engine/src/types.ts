/**
 * Shared engine result shapes. `ScheduleEntry` is a pure finance-engine
 * output type — domain deliberately does not model it (PHASE-02-DECISION-LOG
 * §6): `CalculationRun.outcome.resultSnapshot` stores it only as opaque
 * canonical JSON.
 */
import type { Money, LocalDate } from '@eltizamati/domain'

export interface ScheduleEntry {
  readonly period: number
  readonly date: LocalDate
  readonly openingBalance: Money
  readonly payment: Money
  readonly principal: Money
  readonly cost: Money
  readonly closingBalance: Money
}

export interface ScheduleTotals {
  readonly totalPaid: Money
  readonly totalCost: Money
  readonly totalPrincipal: Money
}

/**
 * A non-blocking notice (BR-CALC-017) — never auto-corrects user data.
 * Structured fact only; copy/i18n is a Phase 7 UI concern, not engine output.
 */
export interface DataConsistencyNotice {
  readonly kind: 'dataConsistencyNotice'
  readonly deviationPercent: string
  readonly thresholdPercent: string
}
