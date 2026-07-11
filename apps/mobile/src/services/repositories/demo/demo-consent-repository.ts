/**
 * In-memory demo consent repository — Phase 5.
 * Stores local acknowledgment records (no server, no Supabase).
 */

import {
  ok,
  type ConsentRepository,
  type ConsentRecord,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

export class DemoConsentRepository implements ConsentRepository {
  readonly #store = new Map<string, ConsentRecord>()

  async status(userId: Id<'user'>): Promise<Result<readonly ConsentRecord[], AppError>> {
    const records = [...this.#store.values()].filter((r) => r.userId === userId)
    return ok(records)
  }

  async acknowledge(record: ConsentRecord): Promise<Result<ConsentRecord, AppError>> {
    this.#store.set(record.id, record)
    return ok(record)
  }

  reset(): void {
    this.#store.clear()
  }
}
