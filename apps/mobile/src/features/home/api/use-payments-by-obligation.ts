/**
 * Batched payment history for a set of obligations — `PaymentRepository` only
 * exposes `listFor(obligationId)` (no user-wide list), so status derivation
 * across a list screen needs one query per obligation, run in parallel via
 * `useQueries` rather than sequential awaits.
 */
import { useQueries } from '@tanstack/react-query'
import {
  isOk,
  type AppError,
  type PaymentRepository,
  type Obligation,
  type Payment,
} from '@eltizamati/domain'
import { paymentKeys } from './keys'

const NO_OBLIGATIONS: readonly Obligation[] = []

export function usePaymentsByObligation(
  repository: PaymentRepository,
  obligations: readonly Obligation[] | undefined,
  userId: string | null,
  isDemoMode = false,
): {
  data: ReadonlyMap<string, readonly Payment[]>
  isLoading: boolean
  isFetching: boolean
  error: AppError | undefined
  refetch: () => Promise<void>
} {
  const availableObligations = obligations ?? NO_OBLIGATIONS
  const results = useQueries({
    queries: availableObligations.map((o) => ({
      queryKey: paymentKeys.listFor(userId ?? '', o.id),
      queryFn: async () => {
        const result = await repository.listFor(o.id)
        if (!isOk(result)) throw result.error
        return result.value
      },
      staleTime: isDemoMode ? Infinity : 30_000,
    })),
  })

  const data = new Map<string, readonly Payment[]>()
  results.forEach((r, i) => {
    const obligation = availableObligations[i]
    if (obligation !== undefined && r.data !== undefined) data.set(obligation.id, r.data)
  })

  return {
    data,
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
    error: results.find((r) => r.error !== null)?.error as AppError | undefined,
    refetch: async () => {
      await Promise.all(results.map((result) => result.refetch()))
    },
  }
}
