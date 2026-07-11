/**
 * Reference TanStack Query + repository-port integration (Phase 4). Shows
 * the pattern later screens should follow: the repository is injected
 * (from the composition root), not imported directly, and a failed
 * `Result` is thrown so it lands in TanStack Query's own error channel,
 * where `toErrorUiState` (core/errors/error-ui-state.ts) turns it into UI
 * state.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { isErr, type Id, type UserProfile, type UserProfileRepository } from '@eltizamati/domain'
import { authKeys } from './keys'

export function useProfileQuery(
  repository: UserProfileRepository,
  userId: Id<'user'>,
): UseQueryResult<UserProfile> {
  return useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: async () => {
      const result = await repository.get(userId)
      if (isErr(result)) throw result.error
      return result.value
    },
  })
}

export function useUpdateProfileMutation(repository: UserProfileRepository) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const result = await repository.save(profile)
      if (isErr(result)) throw result.error
      return result.value
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(authKeys.profile(saved.userId), saved)
    },
  })
}
