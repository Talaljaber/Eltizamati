import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { getDataMode, clearDataMode } from '@/features/demo/stores/demo-mode-store'
import { clearLocalConsent } from '@/features/consent/consent-policy'
import { useAuthServiceLazy } from '@/features/auth/hooks/use-auth-service'
import {
  cancelLocalReminder,
  clearLastNotificationResponse,
} from '@/services/local-notification-service'
import { runLocalUserBoundaryCleanup } from '../services/local-user-boundary-cleanup'
import { subscribeAuthBoundaryChanged } from '../services/auth-boundary-events'

/**
 * The sole app-wide owner of externally-driven session termination. Explicit
 * settings actions perform their server operation separately, then this same
 * local boundary is safe to run again when Supabase emits SIGNED_OUT.
 */
export function AuthBoundaryCoordinator({ resetRuntime }: { readonly resetRuntime: () => void }) {
  const getAuthService = useAuthServiceLazy()
  const queryClient = useQueryClient()
  const router = useRouter()
  const lastUserId = useRef<string | undefined>(undefined)
  const cleanupInFlight = useRef<Promise<void> | undefined>(undefined)

  const cleanup = useCallback(async () => {
    if (cleanupInFlight.current !== undefined) return cleanupInFlight.current
    cleanupInFlight.current = (async () => {
      await runLocalUserBoundaryCleanup({
        cancelQueries: async () => queryClient.cancelQueries(),
        clearQueryCache: () => queryClient.clear(),
        resetRuntime,
        clearTrustState: clearDataMode,
        clearLocalConsent,
        cancelReminder: cancelLocalReminder,
        clearNotificationResponse: clearLastNotificationResponse,
      })
      lastUserId.current = undefined
      router.replace('/auth/sign-in')
    })().finally(() => {
      cleanupInFlight.current = undefined
    })
    return cleanupInFlight.current
  }, [queryClient, resetRuntime, router])

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined

    async function reconcile(): Promise<void> {
      unsubscribe?.()
      unsubscribe = undefined
      const mode = await getDataMode()
      if (!active || mode !== 'personal') return
      const serviceResult = getAuthService()
      if (!serviceResult.ok) return
      const service = serviceResult.value
      const sessionResult = await service.currentSession()
      if (!active) return
      if (!sessionResult.ok) {
        await cleanup()
        return
      }
      if (sessionResult.value === undefined) {
        await cleanup()
        return
      }
      lastUserId.current = sessionResult.value.user.id
      unsubscribe = service.onAuthStateChange((_event, session) => {
        if (!active) return
        if (session?.user.id === undefined) {
          void cleanup().catch(() => undefined)
          return
        }
        if (lastUserId.current !== undefined && lastUserId.current !== session.user.id) {
          void cleanup().catch(() => undefined)
          return
        }
        lastUserId.current = session.user.id
      })
    }

    void reconcile().catch(() => undefined)
    const stopEvents = subscribeAuthBoundaryChanged(() => {
      void reconcile().catch(() => undefined)
    })
    return () => {
      active = false
      stopEvents()
      unsubscribe?.()
    }
  }, [cleanup, getAuthService])

  return null
}
