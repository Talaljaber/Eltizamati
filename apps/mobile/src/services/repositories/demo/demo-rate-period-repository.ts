/**
 * In-memory demo rate-period repository — Phase 5.
 * Append-only per BR-RATE-001. No Supabase imports.
 */

import {
  ok,
  type RatePeriodRepository,
  type RatePeriod,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

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

  reset(): void {
    this.#store.clear()
  }
}
