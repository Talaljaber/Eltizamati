/**
 * useObligation hook — Phase 5.
 * Single obligation lookup by ID.
 */

import { useQuery } from '@tanstack/react-query'
import { isOk, type ObligationRepository, type Id } from '@eltizamati/domain'
import { obligationKeys } from '../../home/api/keys'

export function useObligation(repository: ObligationRepository, id: Id<'obligation'>) {
  return useQuery({
    queryKey: obligationKeys.detail(id),
    queryFn: async () => {
      const result = await repository.get(id)
      if (!isOk(result)) throw result.error
      return result.value
    },
    staleTime: Infinity,
  })
}
