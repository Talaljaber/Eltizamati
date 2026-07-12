import { DEMO_DATE } from '@eltizamati/demo-data'
import { localDateFromDate, type LocalDate, type Obligation } from '@eltizamati/domain'

/** Demo calculations stay frozen; personal calculations use an explicit current local date. */
export function calculationAsOf(obligation: Obligation, now = new Date()): LocalDate {
  return obligation.provenance.source === 'demo' ? DEMO_DATE : localDateFromDate(now)
}
