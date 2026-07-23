import { DEMO_DATE } from '@eltizamati/demo-data'
import { type DataMode, type LocalDate } from '@eltizamati/domain'

/**
 * Resolves a calculation date without reading the clock. The application
 * composition root owns the current personal-mode date and supplies it to
 * every workflow; demo data remains anchored to the signed fixture date.
 *
 * `override` is the demo/testing time-travel date (calculation-as-of-context). When present it
 * wins over both the personal `today` and the demo `DEMO_DATE`, so a reviewer can fast-forward
 * to when a pending rate takes effect and see the loan recompute immediately.
 */
export function calculationAsOf(
  dataMode: DataMode,
  personalAsOf: LocalDate,
  override?: LocalDate,
): LocalDate {
  if (override !== undefined) return override
  return dataMode === 'demo' ? DEMO_DATE : personalAsOf
}

/**
 * One date for an aggregate/list workflow. A non-empty, wholly-demo data set
 * is deterministic; every other set uses the explicit personal-mode date.
 */
export function calculationAsOfForObligations(dataMode: DataMode, personalAsOf: LocalDate): LocalDate {
  return calculationAsOf(dataMode, personalAsOf)
}
