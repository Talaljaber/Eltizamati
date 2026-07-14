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

  // A single in-flight slot shared by demo, personal, and resume-personal
  // entry. These mutate the same global state (data mode, consent, repository
  // boot, onboarding, navigation); running two at once — e.g. a fast double
  // tap on "continue in demo" and "sign in" — could interleave those writes.
  // The shared slot makes entry a globally exclusive operation and makes
  // repeated calls await the same promise.
  const inFlightRef = useRef<Promise<Result<boolean, AppError>> | undefined>(undefined)

  const runExclusive = useCallback(
    (operation: () => Promise<Result<boolean, AppError>>): Promise<Result<boolean, AppError>> => {
      if (inFlightRef.current !== undefined) return inFlightRef.current
      const started = operation().finally(() => {
        inFlightRef.current = undefined
      })
      inFlightRef.current = started
      return started
    },
    [],
  )

  // Core bodies: every thrown error is converted to a typed Result, so a
  // failure never rejects the shared promise and never proceeds to navigation
  // or onboarding completion. Kept separate from the exclusive wrapper so
  // resume can reuse the personal body without nesting (and deadlocking) the
  // shared slot.
  const runDemoEntry = useCallback(async (): Promise<Result<boolean, AppError>> => {
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
    }
  }, [bootDemoMode, router])

  const runPersonalEntry = useCallback(
    async (session: AppAuthSession): Promise<Result<boolean, AppError>> => {
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
      }
    },
    [bootPersonalMode, getConsentRepository, router],
  )

  const completeDemoEntry = useCallback(
    (): Promise<Result<boolean, AppError>> => runExclusive(runDemoEntry),
    [runExclusive, runDemoEntry],
  )

  const completePersonalEntry = useCallback(
    (session: AppAuthSession): Promise<Result<boolean, AppError>> =>
      runExclusive(() => runPersonalEntry(session)),
    [runExclusive, runPersonalEntry],
  )

  const resumePersonalEntry = useCallback(
    (): Promise<Result<boolean, AppError>> =>
      runExclusive(async () => {
        // Session retrieval is inside the exclusive body and the catch
        // boundary, so a thrown currentSession() becomes a typed Result
        // rather than an unhandled rejection.
        try {
          const authServiceResult = getAuthService()
          if (!authServiceResult.ok) return authServiceResult
          const sessionResult = await authServiceResult.value.currentSession()
          if (!sessionResult.ok) return sessionResult
          if (sessionResult.value === undefined) {
            router.replace('/auth/sign-in')
            return ok(false)
          }
          return await runPersonalEntry(sessionResult.value)
        } catch (cause) {
          return err(asAppError(cause))
        }
      }),
    [runExclusive, runPersonalEntry, getAuthService, router],
  )

  return { completeDemoEntry, completePersonalEntry, resumePersonalEntry }
}
