import { useMemo } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { type AppError, type Result } from '@eltizamati/domain'
import type { AuthService } from '@/services/auth/auth-service'
import { clearDataMode } from '@/features/demo/stores/demo-mode-store'
import { clearLocalConsent } from '@/features/consent/consent-policy'
import { cancelLocalReminder, clearLastNotificationResponse } from '@/services/local-notification-service'
import { useResetAppRuntimeIfAvailable } from '@/providers'
import {
  AuthExitCoordinator,
  type AuthExitKind,
  type AuthExitOutcome,
} from '../services/auth-exit-coordinator'

export interface AppAuthExitCoordinator {
  readonly exit: (kind: AuthExitKind) => Promise<Result<AuthExitOutcome, AppError>>
}

export function useAuthExitCoordinator(
  authServiceResult: Result<AuthService, AppError>,
): AppAuthExitCoordinator {
  const queryClient = useQueryClient()
  const resetRuntime = useResetAppRuntimeIfAvailable()
  const router = useRouter()

  return useMemo(() => {
    if (!authServiceResult.ok) {
      return { exit: async () => authServiceResult }
    }
    const coordinator = new AuthExitCoordinator({
      authService: authServiceResult.value,
      cancelQueries: async () => queryClient.cancelQueries(),
      clearQueryCache: () => queryClient.clear(),
      resetRuntime,
      clearTrustState: clearDataMode,
      clearLocalConsent,
      cancelReminder: cancelLocalReminder,
      clearNotificationResponse: clearLastNotificationResponse,
    })
    return {
      exit: async (kind: AuthExitKind) => {
        const result = await coordinator.exit(kind)
        if (result.ok && result.value.exited) {
          router.replace(kind === 'deleteAccount' ? '/onboarding/language' : '/auth/sign-in')
        }
        return result
      },
    }
  }, [authServiceResult, queryClient, resetRuntime, router])
}
