/**
 * Sign-in/sign-up/reset-password mutations (Phase 4, SCR-AUTH-*). Follows
 * the same pattern as use-profile.ts: the AuthService is injected, not
 * imported, and a failed Result is thrown so it lands in TanStack Query's
 * error channel, where toErrorUiState (core/errors/error-ui-state.ts) turns
 * it into UI state.
 *
 * Takes `Result<AuthService, AppError>` (not the bare service) so screens
 * can call these hooks unconditionally even when the service failed to
 * construct (e.g. missing env) — React's rules of hooks forbid calling a
 * hook only inside the `.ok` branch. An unavailable service surfaces as the
 * same typed AppError through the normal mutation error channel.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isErr, type AppError, type Result } from '@eltizamati/domain'
import type { AuthService, AppAuthSession } from '@/services/auth/auth-service'
import { authKeys } from './keys'

export interface SignInInput {
  readonly email: string
  readonly password: string
}

export function useSignInMutation(authServiceResult: Result<AuthService, AppError>) {
  const queryClient = useQueryClient()
  return useMutation<AppAuthSession, AppError, SignInInput>({
    mutationFn: async ({ email, password }: SignInInput): Promise<AppAuthSession> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.signIn(email, password)
      if (isErr(result)) throw result.error
      return result.value
    },
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.session(), session)
    },
  })
}

export interface SignUpInput {
  readonly email: string
  readonly password: string
}

/** Resolves to `undefined` when email verification is pending — no session yet. */
export function useSignUpMutation(authServiceResult: Result<AuthService, AppError>) {
  return useMutation<AppAuthSession | undefined, AppError, SignUpInput>({
    mutationFn: async ({ email, password }: SignUpInput): Promise<AppAuthSession | undefined> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.signUp(email, password)
      if (isErr(result)) throw result.error
      return result.value
    },
  })
}

export function useResetPasswordMutation(authServiceResult: Result<AuthService, AppError>) {
  return useMutation<undefined, AppError, string>({
    mutationFn: async (email: string): Promise<undefined> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.resetPassword(email)
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}
