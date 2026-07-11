/**
 * Pure calendar arithmetic on `LocalDate` (civil dates, no time/timezone —
 * BR-CALC-001). Uses UTC millisecond math so results never depend on the
 * host machine's timezone, without pulling in a date library.
 *
 * This is calendar arithmetic, not financial calculation — it stays in
 * `packages/domain` (used by `deriveObligationStatus`), not
 * `packages/finance-engine`.
 */
import { toLocalDate, type LocalDate } from './id.js'

function parts(date: LocalDate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return { y, m, d }
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isBeforeLocalDate(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDate(a, b) < 0
}

export function isAfterLocalDate(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDate(a, b) > 0
}

export function isAtOrBeforeLocalDate(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDate(a, b) <= 0
}

/** Adds whole months, clamping the day to the target month's length (e.g. Jan 31 + 1mo → Feb 28/29). */
export function addMonthsToLocalDate(date: LocalDate, months: number): LocalDate {
  const { y, m, d } = parts(date)
  const totalMonths = y * 12 + (m - 1) + months
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
  const clampedDay = Math.min(d, daysInTargetMonth)
  return toLocalDate(`${pad(targetYear, 4)}-${pad(targetMonthIndex + 1, 2)}-${pad(clampedDay, 2)}`)
}

export function addDaysToLocalDate(date: LocalDate, days: number): LocalDate {
  const { y, m, d } = parts(date)
  const ms = Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000
  const dt = new Date(ms)
  return toLocalDate(
    `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`,
  )
}

export function daysBetweenLocalDates(from: LocalDate, to: LocalDate): number {
  const f = parts(from)
  const t = parts(to)
  const fromMs = Date.UTC(f.y, f.m - 1, f.d)
  const toMs = Date.UTC(t.y, t.m - 1, t.d)
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000))
}
