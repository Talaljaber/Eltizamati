import { DomainInvariantError } from '../errors/app-error.js'

/**
 * Branded ID type — prevents mixing obligation ids with payment ids etc.
 * IDs are UUID v7 strings (sortable, generated at creation per ADR-0013).
 *
 * @example
 *   const id: Id<'obligation'> = '01930000-0000-7000-...' as Id<'obligation'>
 */
export type Id<T extends string> = string & { readonly _brand: T }

/**
 * Create a typed Id from a raw string.
 * Only repositories and seed factories should call this — UI receives pre-typed ids.
 */
export function brandId<T extends string>(raw: string): Id<T> {
  if (!raw || typeof raw !== 'string') {
    throw new DomainInvariantError('validation', 'Id must be a non-empty string')
  }
  return raw as Id<T>
}

// ─── LocalDate ─────────────────────────────────────────────────────────────

/**
 * Plain ISO 8601 date string (YYYY-MM-DD) — no time, no timezone.
 * Used for loan dates, payment dates, rate effective dates.
 * Always pass an explicit date; never rely on `new Date()` in domain code.
 */
export type LocalDate = string & { readonly _brand: 'LocalDate' }

export function toLocalDate(iso: string): LocalDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new DomainInvariantError('validation', `Invalid LocalDate: "${iso}" — expected YYYY-MM-DD`)
  }
  return iso as LocalDate
}

export function localDateFromDate(date: Date): LocalDate {
  return toLocalDate(date.toISOString().substring(0, 10))
}
