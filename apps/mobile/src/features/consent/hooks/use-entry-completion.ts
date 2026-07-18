import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { err, makeError, ok, type AppError, type Result } from '@eltizamati/domain'
import { logger } from '@/core/logging/logger'
import type { AppAuthSession } from '@/services/auth/auth-service'
import type { ProfileProvisioningDetails } from '@/features/auth/services/ensure-authenticated-user-profile'
import {
  useAuthServiceLazy,
  usePersonalRepositoriesLazy,
} from '@/features/auth/hooks/use-auth-service'
import { setDataMode, setOnboardingComplete } from '@/features/demo/stores/demo-mode-store'
import { useDemoBoot, usePersonalBoot } from '@/providers'
import { isCurrentLocalConsent, readLocalConsent } from '../consent-policy'
import { preparePersonalEntry } from '../services/prepare-personal-entry'
import { runEntryExclusive } from '../services/entry-single-flight'

export interface EntryCompletion {
  readonly completeDemoEntry: () => Promise<Result<boolean, AppError>>
  readonly completePersonalEntry: (
    session: AppAuthSession,
    profileDetails?: ProfileProvisioningDetails,
  ) => Promise<Result<boolean, AppError>>
  readonly resumePersonalEntry: (
    profileDetails?: ProfileProvisioningDetails,
  ) => Promise<Result<boolean, AppError>>
}

function asAppError(cause: unknown): AppError {
  return typeof cause === 'object' && cause !== null && 'code' in cause && 'userMessageKey' in cause
    ? (cause as AppError)
    : makeError('unexpected', { cause })
}

function logEntryNavigation(stage: string): void {
  logger.debug({ stage: `personalEntry:navigation:${stage}` })
}

export function useEntryCompletion(): EntryCompletion {
  const router = useRouter()
  const { i18n } = useTranslation()
  const bootDemoMode = useDemoBoot()
  const bootPersonalMode = usePersonalBoot()
  const getAuthService = useAuthServiceLazy()
  const getPersonalRepositories = usePersonalRepositoriesLazy()
  const locale: 'en' | 'ar' = i18n.language.startsWith('ar') ? 'ar' : 'en'

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
    async (
      session: AppAuthSession,
      profileDetails?: ProfileProvisioningDetails,
    ): Promise<Result<boolean, AppError>> => {
      try {
        const repositoriesResult = getPersonalRepositories()
        if (!repositoriesResult.ok) return repositoriesResult
        const preparation = await preparePersonalEntry({
          session,
          locale,
          repositories: repositoriesResult.value,
          bootPersonalMode,
          profileDetails,
        })
        if (!preparation.ok) return preparation
        if (preparation.value === 'consentRequired') {
          logEntryNavigation('replace_consent')
          router.replace('/onboarding/consent?next=personal')
          return ok(false)
        }
        logEntryNavigation('replace_home')
        router.replace('/(tabs)/')
        return ok(true)
      } catch (cause) {
        return err(asAppError(cause))
      }
    },
    [bootPersonalMode, getPersonalRepositories, locale, router],
  )

  const completeDemoEntry = useCallback(
    (): Promise<Result<boolean, AppError>> => runEntryExclusive(runDemoEntry),
    [runDemoEntry],
  )

  const completePersonalEntry = useCallback(
    (
      session: AppAuthSession,
      profileDetails?: ProfileProvisioningDetails,
    ): Promise<Result<boolean, AppError>> =>
      runEntryExclusive(() => runPersonalEntry(session, profileDetails)),
    [runPersonalEntry],
  )

  const resumePersonalEntry = useCallback(
    (profileDetails?: ProfileProvisioningDetails): Promise<Result<boolean, AppError>> =>
      runEntryExclusive(async () => {
        try {
          const authServiceResult = getAuthService()
          if (!authServiceResult.ok) return authServiceResult
          const sessionResult = await authServiceResult.value.currentSession()
          if (!sessionResult.ok) return sessionResult
          if (sessionResult.value === undefined) {
            router.replace('/auth/sign-in')
            return ok(false)
          }
          return await runPersonalEntry(sessionResult.value, profileDetails)
        } catch (cause) {
          return err(asAppError(cause))
        }
      }),
    [getAuthService, router, runPersonalEntry],
  )

  return { completeDemoEntry, completePersonalEntry, resumePersonalEntry }
}
