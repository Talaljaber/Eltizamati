/**
 * Sign-out / delete-account mutations (FR-SET-007). Same injected-service,
 * thrown-Result pattern as use-auth-mutations.ts.
 */
import { useMutation } from '@tanstack/react-query'
import { isErr, type AppError, type Result } from '@eltizamati/domain'
import type { AuthService } from '@/services/auth/auth-service'
import type { AppAuthExitCoordinator } from '../hooks/use-auth-exit-coordinator'

export function useSignOutMutation(
  authServiceResult: Result<AuthService, AppError>,
  coordinator: AppAuthExitCoordinator,
) {
  return useMutation<undefined, AppError, undefined>({
    mutationFn: async (): Promise<undefined> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await coordinator.exit('signOut')
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}

/** FR-SET-003 (personal mode): erasure via account deletion, per ADR-0017. */
export function useDeleteAccountMutation(
  authServiceResult: Result<AuthService, AppError>,
  coordinator: AppAuthExitCoordinator,
) {
  return useMutation<undefined, AppError, undefined>({
    mutationFn: async (): Promise<undefined> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await coordinator.exit('deleteAccount')
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}
