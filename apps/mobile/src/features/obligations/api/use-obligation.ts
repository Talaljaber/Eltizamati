/**
 * useObligation hook — Phase 5.
 * Single obligation lookup by ID.
 */

import { useQuery } from '@tanstack/react-query'
import { isOk, type ObligationRepository, type Id } from '@eltizamati/domain'
import { obligationKeys } from '../../home/api/keys'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'

export function useObligation(repository: ObligationRepository, id: Id<'obligation'>) {
  const activeUser = useActiveUser()
  return useQuery({
    queryKey: obligationKeys.detail(activeUser ?? '', id),
    queryFn: async () => {
      const result = await repository.get(id)
      if (!isOk(result)) throw result.error
      return result.value
    },
    staleTime: Infinity,
  })
}
