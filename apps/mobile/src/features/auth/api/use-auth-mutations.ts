import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isErr, type AppError, type Result } from '@eltizamati/domain'
import type { AuthService, AppAuthSession } from '@/services/auth/auth-service'
import { authKeys } from './keys'

export interface EmailPasswordInput {
  readonly email: string
  readonly password: string
}

export function useSignUpMutation(authServiceResult: Result<AuthService, AppError>) {
  return useMutation<undefined, AppError, EmailPasswordInput>({
    mutationFn: async ({ email, password }): Promise<undefined> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.signUp(email, password)
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}

export function useSignInMutation(authServiceResult: Result<AuthService, AppError>) {
  const queryClient = useQueryClient()
  return useMutation<AppAuthSession, AppError, EmailPasswordInput>({
    mutationFn: async ({ email, password }) => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.signIn(email, password)
      if (isErr(result)) throw result.error
      return result.value
    },
    onSuccess: (session) => queryClient.setQueryData(authKeys.session(), session),
  })
}

export function useResendSignupOtpMutation(authServiceResult: Result<AuthService, AppError>) {
  return useMutation<undefined, AppError, string>({
    mutationFn: async (email): Promise<undefined> => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.resendSignupOtp(email)
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}

export interface VerifyEmailOtpInput {
  readonly email: string
  readonly code: string
}

export function useVerifySignupOtpMutation(authServiceResult: Result<AuthService, AppError>) {
  const queryClient = useQueryClient()
  return useMutation<AppAuthSession, AppError, VerifyEmailOtpInput>({
    mutationFn: async ({ email, code }) => {
      if (!authServiceResult.ok) throw authServiceResult.error
      const result = await authServiceResult.value.verifySignupOtp(email, code)
      if (isErr(result)) throw result.error
      return result.value
    },
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.session(), session)
    },
  })
}
