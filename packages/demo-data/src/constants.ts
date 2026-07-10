/**
 * Central constants for the demo data package.
 */
import { toLocalDate, type LocalDate } from '@eltizamati/domain'

/**
 * The fixed anchor date for all demo seed data and calculation test vectors (TV-30x).
 * CHANGING THIS IS A BREAKING CHANGE — it requires regenerating all date-dependent test vectors
 * because residual calculations rely on exact period alignment.
 *
 * Rule: F-04 / seed-demo-data.md
 */
export const DEMO_DATE: LocalDate = toLocalDate('2026-07-01')

export const DEMO_SEED_VERSION = 'v1'
