/**
 * All of the active user's insights, grouped by `obligationId` — mirrors
 * `usePaymentsByObligation`'s shape so list/detail screens can feed real
 * insights into `deriveObligationStatus` instead of a hardcoded `[]`.
 * `InsightRepository.list()` is user-wide (no per-obligation variant), so
 * this is one query, grouped client-side, rather than one query per row.
 */
import { useQuery } from '@tanstack/react-query'
import { isOk, type InsightRepository, type Insight, type Id } from '@eltizamati/domain'
import { insightKeys } from './keys'

export function useInsightsByObligation(
  repository: InsightRepository,
  userId: Id<'user'> | null,
): { data: ReadonlyMap<string, readonly Insight[]>; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: insightKeys.list(userId ?? ''),
    queryFn: async () => {
      if (!userId) return []
      const result = await repository.list(userId)
      if (!isOk(result)) throw result.error
      return result.value
    },
    enabled: userId !== null,
    staleTime: Infinity,
  })

  const grouped = new Map<string, Insight[]>()
  for (const insight of data ?? []) {
    if (insight.obligationId === undefined) continue
    const existing = grouped.get(insight.obligationId)
    if (existing) {
      existing.push(insight)
    } else {
      grouped.set(insight.obligationId, [insight])
    }
  }

  return { data: grouped, isLoading: userId !== null && isLoading }
}
