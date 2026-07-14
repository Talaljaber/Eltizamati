/**
 * useObligations hook — Phase 5.
 *
 * TanStack Query hook over ObligationRepository.list().
 * Works for both demo and (future) Supabase repositories — callers
 * pass the repository instance from context, not hard-coded to demo.
 *
 * Financial logic is NOT performed here (AI_AGENT_RULES §6).
 * Status derivation uses deriveObligationStatus from domain — not computed inline.
 */

import { useQuery } from '@tanstack/react-query'
import { isOk, type ObligationRepository, type Id } from '@eltizamati/domain'
import { obligationKeys } from './keys'

export function useObligations(
  repository: ObligationRepository,
  userId: Id<'user'>,
  isDemoMode = false,
) {
  return useQuery({
    queryKey: obligationKeys.list(userId),
    queryFn: async () => {
      const result = await repository.list(userId)
      if (!isOk(result)) throw result.error
      return result.value
    },
    enabled: userId !== '',
    staleTime: isDemoMode ? Infinity : 30_000,
  })
}
