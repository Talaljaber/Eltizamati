/**
 * Batched payment history for a set of obligations — `PaymentRepository` only
 * exposes `listFor(obligationId)` (no user-wide list), so status derivation
 * across a list screen needs one query per obligation, run in parallel via
 * `useQueries` rather than sequential awaits.
 */
import { useQueries } from '@tanstack/react-query'
import { isOk, type PaymentRepository, type Obligation, type Payment } from '@eltizamati/domain'
import { paymentKeys } from './keys'

export function usePaymentsByObligation(
  repository: PaymentRepository,
  obligations: readonly Obligation[],
): { data: ReadonlyMap<string, readonly Payment[]>; isLoading: boolean } {
  const results = useQueries({
    queries: obligations.map((o) => ({
      queryKey: paymentKeys.listFor(o.id),
      queryFn: async () => {
        const result = await repository.listFor(o.id)
        if (!isOk(result)) throw result.error
        return result.value
      },
      staleTime: Infinity,
    })),
  })

  const data = new Map<string, readonly Payment[]>()
  results.forEach((r, i) => {
    const obligation = obligations[i]
    if (obligation !== undefined) data.set(obligation.id, r.data ?? [])
  })

  return { data, isLoading: results.some((r) => r.isLoading) }
}
