import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRouter, useSegments, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { makeError, type AppError } from '@eltizamati/domain'
import { ErrorState, useTheme } from '@/core/design-system'
import { toErrorUiState } from '@/core/errors/error-ui-state'
import { releaseNativeSplash } from '@/features/startup/services/splash-release'
import { readStartupTrustState } from '@/features/demo/stores/demo-mode-store'
import { isCurrentLocalConsent, readLocalConsent } from '@/features/consent/consent-policy'
import {
  useAuthServiceLazy,
  usePersonalRepositoriesLazy,
} from '@/features/auth/hooks/use-auth-service'
import { preparePersonalEntry } from '@/features/consent/services/prepare-personal-entry'
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
  const initialSegmentsRef = useRef<readonly string[]>(segments)
  const getAuthService = useAuthServiceLazy()
  const getPersonalRepositories = usePersonalRepositoriesLazy()
  const bootDemoMode = useDemoBoot()
  const bootPersonalMode = usePersonalBoot()
  const [phase, setPhase] = useState<StartupPhase>('starting')
  const [startupError, setStartupError] = useState<AppError | undefined>()
  const [redirectTarget, setRedirectTarget] = useState<Href | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)
  const i18nRef = useRef(i18n)
  i18nRef.current = i18n
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    let active = true
    let splashHideFailed = false

    async function releaseSplash() {
      try {
        await releaseNativeSplash()
      } catch (cause) {
        splashHideFailed = true
        throw cause
      }
    }

    async function waitForI18n() {
      const instance = i18nRef.current
      if (instance.isInitialized) return
      await i18nInitialization
    }

    // Both the settle-here and redirect-elsewhere outcomes must render the
    // router Stack (phase 'ready') and release the native splash. A redirect
    // that left phase 'starting' kept the spinner mounted forever, so the
    // replaced route could never render and the splash never lifted. The
    // actual router.replace runs from an effect once the Stack is mounted.
    async function settle(target?: Href) {
      if (!active) return
      if (target !== undefined) setRedirectTarget(target)
      setPhase('ready')
      await releaseSplash()
    }

    async function start() {
      setPhase('starting')
      setStartupError(undefined)
      setRedirectTarget(undefined)
      try {
        await waitForI18n()
        if (!active) return

        const segmentPath = initialSegmentsRef.current
        const group = segmentPath[0]
        // Callback and auth screens own their own recoverable states. They
        // must be mountable on a cold start before a data mode exists.
        if (group === 'auth') {
          await settle()
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
            await settle('/onboarding/consent')
            return
          }
          await settle()
          return
        }

        if (!trust.onboardingComplete || trust.dataMode === null) {
          await settle('/onboarding/language')
          return
        }

        if (trust.dataMode === 'demo') {
          if (!hasCurrentConsent) {
            await settle('/onboarding/consent?next=demo')
            return
          }
          await bootDemoMode()
          if (!active) return
          await settle()
          return
        }

        const authServiceResult = getAuthService()
        if (!authServiceResult.ok) throw authServiceResult.error
        const sessionResult = await authServiceResult.value.currentSession()
        if (!active) return
        if (!sessionResult.ok) throw sessionResult.error
        if (sessionResult.value === undefined) {
          await settle('/auth/sign-in')
          return
        }

        const repositoriesResult = getPersonalRepositories()
        if (!repositoriesResult.ok) throw repositoriesResult.error
        const preparation = await preparePersonalEntry({
          session: sessionResult.value,
          locale: i18nRef.current.language.startsWith('ar') ? 'ar' : 'en',
          repositories: repositoriesResult.value,
          bootPersonalMode,
        })
        if (!preparation.ok) throw preparation.error
        if (!active) return
        const target =
          preparation.value === 'consentRequired'
            ? '/onboarding/consent?next=personal'
            : preparation.value === 'bankConnectRequired'
              ? '/connect-bank'
              : '/(tabs)/'
        await settle(target)
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
  }, [attempt, bootDemoMode, bootPersonalMode, getAuthService, getPersonalRepositories])

  // Issue the redirect only after the Stack is mounted (phase 'ready'),
  // never while the spinner is up — replacing before the navigator mounts is
  // dropped by expo-router. A throw here is a recoverable startup error.
  //
  // The root Stack's initialRouteName="auth" (app/_layout.tsx) combined with the auth
  // group's own initialRouteName="sign-in" (app/auth/_layout.tsx) means '/auth/sign-in'
  // is ALREADY the very first route the Stack renders the instant it mounts here — before
  // this effect runs at all. Replacing to that identical path was a redundant no-op
  // navigation that still played a full mount/transition, visibly rendering sign-in twice
  // on a cold start with no session. Every other redirect target below genuinely differs
  // from that default, so it still needs the explicit replace.
  useEffect(() => {
    if (phase !== 'ready' || redirectTarget === undefined) return
    if (redirectTarget === '/auth/sign-in') return
    try {
      routerRef.current.replace(redirectTarget)
    } catch (error) {
      setStartupError(asAppError(error))
      setPhase('error')
    }
  }, [phase, redirectTarget])

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
