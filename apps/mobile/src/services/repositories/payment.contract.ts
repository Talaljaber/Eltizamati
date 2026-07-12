// uses global jest functions
import type { PaymentRepository, Payment, Id } from '@eltizamati/domain'
import { brandId, userEntered, Money } from '@eltizamati/domain'

function makePayment(
  id: Id<'payment'>,
  obligationId: Id<'obligation'>,
  userId: Id<'user'>,
  date: string,
  amount: string,
): Payment {
  const now = '2026-07-01T00:00:00.000Z'
  return {
    id,
    obligationId,
    userId,
    date: date as Payment['date'],
    amount: Money.of(amount, 'JOD'),
    provenance: userEntered(undefined, now).provenance,
    createdAt: now,
  }
}

/**
 * Runs contract tests for any PaymentRepository implementation.
 * `getObligationId`/`getUserId` are lazy — Supabase's fixture obligation is
 * only created inside an async `beforeAll`, so the id isn't known at
 * describe-time when this function runs; the demo call site just wraps a
 * constant. `obligationId` must be a real, already-persisted obligation
 * owned by `userId` — Supabase's `payments` table has a
 * `(obligation_id, user_id)` foreign key onto `obligations`, which the demo
 * repository doesn't enforce but the contract fixtures must satisfy either way.
 */
export function runPaymentRepositoryContractTests(
  repoFactory: () => PaymentRepository,
  getUserId: () => Id<'user'>,
  getObligationId: () => Id<'obligation'>,
  cleanup: () => Promise<void> | void = () => undefined,
) {
  describe('PaymentRepository Contract', () => {
    it('log then listFor round-trips the payment', async () => {
      const repo = repoFactory()
      const userId = getUserId()
      const obligationId = getObligationId()
      const id = brandId<'payment'>(crypto.randomUUID())
      const payment = makePayment(id, obligationId, userId, '2026-02-15', '307')

      const logged = await repo.log(payment)
      expect(logged.ok).toBe(true)

      const list = await repo.listFor(obligationId)
      expect(list.ok).toBe(true)
      if (list.ok) {
        const found = list.value.find((p) => p.id === id)
        expect(found).toBeDefined()
        expect(found?.amount.equals(Money.of('307', 'JOD'))).toBe(true)
      }

      await cleanup()
    })

    it('listFor an obligation with no payments returns an empty list', async () => {
      const repo = repoFactory()
      const emptyObligationId = brandId<'obligation'>(crypto.randomUUID())

      const list = await repo.listFor(emptyObligationId)
      expect(list.ok).toBe(true)
      if (list.ok) expect(list.value).toHaveLength(0)

      await cleanup()
    })

    it('listFor only returns payments for the requested obligation', async () => {
      const repo = repoFactory()
      const otherObligationId = brandId<'obligation'>(crypto.randomUUID())
      const idForThis = brandId<'payment'>(crypto.randomUUID())

      await repo.log(makePayment(idForThis, getObligationId(), getUserId(), '2026-03-15', '307'))

      const list = await repo.listFor(otherObligationId)
      expect(list.ok).toBe(true)
      if (list.ok) expect(list.value.some((p) => p.id === idForThis)).toBe(false)

      await cleanup()
    })
  })
}
