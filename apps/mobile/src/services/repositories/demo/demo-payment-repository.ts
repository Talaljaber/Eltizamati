/**
 * In-memory demo payment repository — Phase 5.
 * Implements PaymentRepository over a plain Map (by obligationId).
 * No Supabase imports.
 */

import {
  ok,
  type PaymentRepository,
  type Payment,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

export class DemoPaymentRepository implements PaymentRepository {
  readonly #store = new Map<string, Payment[]>()

  async listFor(obligationId: Id<'obligation'>): Promise<Result<readonly Payment[], AppError>> {
    return ok(this.#store.get(obligationId) ?? [])
  }

  async log(payment: Payment): Promise<Result<Payment, AppError>> {
    const existing = this.#store.get(payment.obligationId) ?? []
    this.#store.set(payment.obligationId, [...existing, payment])
    return ok(payment)
  }

  reset(): void {
    this.#store.clear()
  }
}
