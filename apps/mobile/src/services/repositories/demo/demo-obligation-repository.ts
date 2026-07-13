/**
 * In-memory demo obligation repository — Phase 5 (ADR-0017 §2).
 *
 * Implements ObligationRepository over a plain Map.
 * No Supabase imports — guaranteed by depcruise.
 * Isolated per createDemoRepositories() call — never shares state.
 */

import {
  ok,
  err,
  makeError,
  localDateFromDate,
  type ObligationRepository,
  type Obligation,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

export class DemoObligationRepository implements ObligationRepository {
  readonly #store = new Map<string, Obligation>()

  async list(userId: Id<'user'>): Promise<Result<readonly Obligation[], AppError>> {
    const obligations = [...this.#store.values()].filter((o) => o.userId === userId)
    return ok(obligations)
  }

  async get(id: Id<'obligation'>): Promise<Result<Obligation, AppError>> {
    const obligation = this.#store.get(id)
    if (!obligation) {
      return err(makeError('notFound', { safeMetadata: { id } }))
    }
    return ok(obligation)
  }

  async save(obligation: Obligation): Promise<Result<Obligation, AppError>> {
    this.#store.set(obligation.id, obligation)
    return ok(obligation)
  }

  async archive(id: Id<'obligation'>): Promise<Result<void, AppError>> {
    const obligation = this.#store.get(id)
    if (!obligation) {
      return err(makeError('notFound', { safeMetadata: { id } }))
    }
    this.#store.set(id, { ...obligation, closedDate: localDateFromDate(new Date()) })
    return ok(undefined)
  }

  async delete(id: Id<'obligation'>): Promise<Result<void, AppError>> {
    if (!this.#store.has(id)) {
      return err(makeError('notFound', { safeMetadata: { id } }))
    }
    this.#store.delete(id)
    return ok(undefined)
  }

  /** Reset — clears all stored obligations. */
  reset(): void {
    this.#store.clear()
  }

  /** Snapshot count for test assertions. */
  get size(): number {
    return this.#store.size
  }
}
