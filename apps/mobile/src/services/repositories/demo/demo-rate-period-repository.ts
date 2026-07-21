/**
 * In-memory demo rate-period repository — Phase 5.
 * Append-only per BR-RATE-001. No Supabase imports.
 */

import {
  err,
  ok,
  makeError,
  type RatePeriodRepository,
  type RatePeriod,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

function isSameRatePeriodData(a: RatePeriod, b: RatePeriod): boolean {
  return (
    a.annualRate.equals(b.annualRate) &&
    a.effectiveFrom === b.effectiveFrom &&
    (a.benchmarkRate?.toStorageString() ?? null) === (b.benchmarkRate?.toStorageString() ?? null) &&
    (a.margin?.toStorageString() ?? null) === (b.margin?.toStorageString() ?? null)
  )
}

export class DemoRatePeriodRepository implements RatePeriodRepository {
  readonly #store = new Map<string, RatePeriod[]>()

  async historyFor(
    obligationId: Id<'obligation'>,
  ): Promise<Result<readonly RatePeriod[], AppError>> {
    return ok(this.#store.get(obligationId) ?? [])
  }

  /** Append-only (BR-RATE-001) — never mutates existing entries. */
  async append(period: RatePeriod): Promise<Result<RatePeriod, AppError>> {
    const existing = this.#store.get(period.obligationId) ?? []
    this.#store.set(period.obligationId, [...existing, period])
    return ok(period)
  }

  /** Idempotent variant for deterministic-id callers (provider import retry). */
  async appendIfAbsent(period: RatePeriod): Promise<Result<RatePeriod, AppError>> {
    const existing = this.#store.get(period.obligationId) ?? []
    const match = existing.find((candidate) => candidate.id === period.id)
    if (match !== undefined) {
      if (isSameRatePeriodData(match, period)) return ok(match)
      return err(
        makeError('dataConflict', { safeMetadata: { entity: 'ratePeriod', ratePeriodId: period.id } }),
      )
    }
    this.#store.set(period.obligationId, [...existing, period])
    return ok(period)
  }

  reset(): void {
    this.#store.clear()
  }
}
