/**
 * useInsights hook — Phase 5.
 * TanStack Query hook over InsightRepository.list().
 */

import { useQuery } from '@tanstack/react-query'
import { isOk, type InsightRepository, type Id } from '@eltizamati/domain'
import { insightKeys } from './keys'

export function useInsights(repository: InsightRepository, userId: Id<'user'>, isDemoMode = false) {
  return useQuery({
    queryKey: insightKeys.list(userId),
    queryFn: async () => {
      const result = await repository.list(userId)
      if (!isOk(result)) throw result.error
      return result.value
    },
    enabled: userId !== '',
    staleTime: isDemoMode ? Infinity : 30_000,
  })
}
