import { DomainInvariantError } from '../errors/app-error.js'
import { sha256Hex } from '../services/canonical-json.js'

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
    throw new DomainInvariantError(
      'validation',
      `Invalid LocalDate: "${iso}" — expected YYYY-MM-DD`,
    )
  }
  return iso as LocalDate
}

export function localDateFromDate(date: Date): LocalDate {
  return toLocalDate(date.toISOString().substring(0, 10))
}

// ─── Deterministic UUID ────────────────────────────────────────────────────

/**
 * Derives a stable, valid Postgres `uuid` from an arbitrary seed string —
 * for provider-imported records where re-running the same import must
 * produce the same id (idempotent re-import) instead of a fresh random one.
 * Never use for anything requiring unpredictability (this is not a secret).
 */
export function deterministicUuid(seed: string): string {
  const hex = sha256Hex(seed)
  const timeLow = hex.slice(0, 8)
  const timeMid = hex.slice(8, 12)
  const version = `4${hex.slice(13, 16)}`
  const variantNibble = ['8', '9', 'a', 'b'][parseInt(hex[16] as string, 16) % 4] as string
  const clockSeq = `${variantNibble}${hex.slice(17, 20)}`
  const node = hex.slice(20, 32)
  return `${timeLow}-${timeMid}-${version}-${clockSeq}-${node}`
}
