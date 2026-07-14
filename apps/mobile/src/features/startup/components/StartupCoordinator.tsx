import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRouter, useSegments, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as SplashScreen from 'expo-splash-screen'
import { brandId, makeError, type AppError } from '@eltizamati/domain'
import { ErrorState, useTheme } from '@/core/design-system'
import { toErrorUiState } from '@/core/errors/error-ui-state'
import { isExpoGo } from '@/core/config/runtime-environment'
import { readStartupTrustState } from '@/features/demo/stores/demo-mode-store'
import {
  ensurePersonalConsent,
  isCurrentLocalConsent,
  readLocalConsent,
} from '@/features/consent/consent-policy'
import {
  useAuthServiceLazy,
  useConsentRepositoryLazy,
} from '@/features/auth/hooks/use-auth-service'
import { useDemoBoot, usePersonalBoot } from '@/providers'
import { i18nInitialization } from '@/i18n'

type StartupPhase = 'starting' | 'ready' | 'error'

function asAppError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null && 'code' in error && 'userMessageKey' in error) {
    return error as AppError
  }
  return makeError('unexpected', { cause: error })
}

export function StartupCoordinator({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const segments = useSegments()
  const getAuthService = useAuthServiceLazy()
  const getConsentRepository = useConsentRepositoryLazy()
  const bootDemoMode = useDemoBoot()
  const bootPersonalMode = usePersonalBoot()
  const [phase, setPhase] = useState<StartupPhase>('starting')
  const [startupError, setStartupError] = useState<AppError | undefined>()
  const [attempt, setAttempt] = useState(0)
  const splashReleased = useRef(false)
  const i18nRef = useRef(i18n)
  i18nRef.current = i18n
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    let active = true
    let splashHideFailed = false

    async function releaseSplash() {
      if (splashReleased.current || isExpoGo) return
      try {
        await SplashScreen.hideAsync()
      } catch (cause) {
        splashHideFailed = true
        throw cause
      }
      splashReleased.current = true
    }

    async function waitForI18n() {
      const instance = i18nRef.current
      if (instance.isInitialized) return
      await i18nInitialization
    }

    function redirect(path: Href) {
      if (active) routerRef.current.replace(path)
    }

    async function start() {
      setPhase('starting')
      setStartupError(undefined)
      try {
        await waitForI18n()
        if (!active) return

        const segmentPath = segments as readonly string[]
        const group = segmentPath[0]
        // Callback and auth screens own their own recoverable states. They
        // must be mountable on a cold start before a data mode exists.
        if (group === 'auth') {
          setPhase('ready')
          await releaseSplash()
          return
        }

        const [trustResult, localConsentResult] = await Promise.all([
          readStartupTrustState(),
          readLocalConsent(),
        ])
        if (!active) return
        if (!trustResult.ok) throw trustResult.error
        if (!localConsentResult.ok) throw localConsentResult.error

        const trust = trustResult.value
        const hasCurrentConsent = isCurrentLocalConsent(localConsentResult.value)

        if (group === 'onboarding') {
          if (segmentPath[1] === 'mode' && !hasCurrentConsent) {
            redirect('/onboarding/consent')
            return
          }
          setPhase('ready')
          await releaseSplash()
          return
        }

        if (!trust.onboardingComplete || trust.dataMode === null || !hasCurrentConsent) {
          redirect('/onboarding/language')
          return
        }

        if (trust.dataMode === 'demo') {
          await bootDemoMode()
          if (!active) return
          setPhase('ready')
          await releaseSplash()
          return
        }

        const authServiceResult = getAuthService()
        if (!authServiceResult.ok) throw authServiceResult.error
        const sessionResult = await authServiceResult.value.currentSession()
        if (!active) return
        if (!sessionResult.ok) throw sessionResult.error
        if (sessionResult.value === undefined) {
          redirect('/auth/sign-in')
          return
        }

        const consentRepositoryResult = getConsentRepository()
        if (!consentRepositoryResult.ok) throw consentRepositoryResult.error
        const consentResult = await ensurePersonalConsent(
          brandId<'user'>(sessionResult.value.user.id),
          consentRepositoryResult.value,
        )
        if (!consentResult.ok) throw consentResult.error
        await bootPersonalMode()
        if (!active) return
        setPhase('ready')
        await releaseSplash()
      } catch (error) {
        if (!active) return
        setStartupError(asAppError(error))
        setPhase('error')
        // A failed hide is itself the retryable error. For every other startup
        // failure, still release the native splash so the React retry surface
        // is reachable.
        if (!splashHideFailed) {
          try {
            await releaseSplash()
          } catch (splashError) {
            if (active) setStartupError(asAppError(splashError))
          }
        }
      }
    }

    void start()
    return () => {
      active = false
    }
  }, [attempt, bootDemoMode, bootPersonalMode, getAuthService, getConsentRepository, segments])

  if (phase === 'error' && startupError !== undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ErrorState
          state={toErrorUiState(startupError)}
          onRetry={() => setAttempt((value) => value + 1)}
          testID="startup-error"
        />
      </View>
    )
  }

  if (phase !== 'ready') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]} testID="startup-pending">
        <ActivityIndicator color={theme.brand} />
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
