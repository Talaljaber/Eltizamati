import { useCallback, useRef } from 'react'
import { useRouter } from 'expo-router'
import { brandId, err, makeError, ok, type AppError, type Result } from '@eltizamati/domain'
import type { AppAuthSession } from '@/services/auth/auth-service'
import {
  useAuthServiceLazy,
  useConsentRepositoryLazy,
} from '@/features/auth/hooks/use-auth-service'
import { setDataMode, setOnboardingComplete } from '@/features/demo/stores/demo-mode-store'
import { useDemoBoot, usePersonalBoot } from '@/providers'
import { ensurePersonalConsent, isCurrentLocalConsent, readLocalConsent } from '../consent-policy'
import { notifyAuthBoundaryChanged } from '@/features/auth/services/auth-boundary-events'
import { enableNotificationNavigation } from '@/services/local-notification-service'

export interface EntryCompletion {
  readonly completeDemoEntry: () => Promise<Result<boolean, AppError>>
  readonly completePersonalEntry: (session: AppAuthSession) => Promise<Result<boolean, AppError>>
  readonly resumePersonalEntry: () => Promise<Result<boolean, AppError>>
}

function asAppError(cause: unknown): AppError {
  return typeof cause === 'object' && cause !== null && 'code' in cause && 'userMessageKey' in cause
    ? (cause as AppError)
    : makeError('unexpected', { cause })
}

/**
 * Central terminal-entry owner. A `true` result means tabs were entered;
 * `false` means the user was safely routed to the missing prerequisite.
 */
export function useEntryCompletion(): EntryCompletion {
  const router = useRouter()
  const bootDemoMode = useDemoBoot()
  const bootPersonalMode = usePersonalBoot()
  const getAuthService = useAuthServiceLazy()
  const getConsentRepository = useConsentRepositoryLazy()
  const demoCompletionRef = useRef<Promise<Result<boolean, AppError>> | undefined>(undefined)
  const personalCompletionRef = useRef<Promise<Result<boolean, AppError>> | undefined>(undefined)

  const completeDemoEntry = useCallback((): Promise<Result<boolean, AppError>> => {
    if (demoCompletionRef.current !== undefined) return demoCompletionRef.current
    demoCompletionRef.current = (async () => {
      try {
        const localResult = await readLocalConsent()
        if (!localResult.ok) return localResult
        if (!isCurrentLocalConsent(localResult.value)) {
          router.replace('/onboarding/consent?next=demo')
          return ok(false)
        }
        await setDataMode('demo')
        await bootDemoMode()
        await setOnboardingComplete()
        router.replace('/(tabs)/')
        return ok(true)
      } catch (cause) {
        return err(asAppError(cause))
      } finally {
        demoCompletionRef.current = undefined
      }
    })()
    return demoCompletionRef.current
  }, [bootDemoMode, router])

  const completePersonalEntry = useCallback(
    (session: AppAuthSession): Promise<Result<boolean, AppError>> => {
      if (personalCompletionRef.current !== undefined) return personalCompletionRef.current
      personalCompletionRef.current = (async () => {
        try {
          const localResult = await readLocalConsent()
          if (!localResult.ok) return localResult
          if (!isCurrentLocalConsent(localResult.value)) {
            await setDataMode('personal')
            notifyAuthBoundaryChanged()
            router.replace('/onboarding/consent?next=personal')
            return ok(false)
          }
          const consentRepositoryResult = getConsentRepository()
          if (!consentRepositoryResult.ok) return consentRepositoryResult
          const consentResult = await ensurePersonalConsent(
            brandId<'user'>(session.user.id),
            consentRepositoryResult.value,
          )
          if (!consentResult.ok) return consentResult

          await setDataMode('personal')
          notifyAuthBoundaryChanged()
          await bootPersonalMode()
          await setOnboardingComplete()
          enableNotificationNavigation()
          router.replace('/(tabs)/')
          return ok(true)
        } catch (cause) {
          return err(asAppError(cause))
        } finally {
          personalCompletionRef.current = undefined
        }
      })()
      return personalCompletionRef.current
    },
    [bootPersonalMode, getConsentRepository, router],
  )

  const resumePersonalEntry = useCallback(async (): Promise<Result<boolean, AppError>> => {
    const authServiceResult = getAuthService()
    if (!authServiceResult.ok) return authServiceResult
    const sessionResult = await authServiceResult.value.currentSession()
    if (!sessionResult.ok) return sessionResult
    if (sessionResult.value === undefined) {
      router.replace('/auth/sign-in')
      return { ok: true, value: false }
    }
    return completePersonalEntry(sessionResult.value)
  }, [completePersonalEntry, getAuthService, router])

  return { completeDemoEntry, completePersonalEntry, resumePersonalEntry }
}
