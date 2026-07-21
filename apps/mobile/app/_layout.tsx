import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useTranslation } from 'react-i18next'
import { AppProviders } from '../src/providers'
import { StartupCoordinator } from '../src/features/startup/components/StartupCoordinator'
import '../src/i18n' // Initialize i18n
import { useNotificationResponse } from '../src/features/notifications/hooks/use-notification-response'
import { useDeepLinkGuard } from '../src/core/security/use-deep-link-guard'
import { useTheme } from '../src/core/design-system'
import { isExpoGo } from '../src/core/config/runtime-environment'
import * as Sentry from '@sentry/react-native'
import { initSentry } from '../src/core/observability/sentry'

// No-op unless both a release build and EXPO_PUBLIC_SENTRY_DSN are present
// (ADR-0015) — safe to call unconditionally at module scope.
initSentry()

// Keep the native splash up past its default auto-hide point — StartupCoordinator
// decides (asynchronously, via AsyncStorage) whether to show onboarding or the
// tabs, and hides the splash itself once that decision has landed. Without
// this, the native splash can auto-hide before that check resolves, exposing
// a frame of the wrong screen (or, if the JS thread is slow to start, leave
// the app looking stuck on a plain color screen with no visible progress).
//
// Skipped entirely in Expo Go: it never registers a native splash screen for
// this API in the first place, so calling it (even with a caught rejection)
// still surfaces a red-box error there — see runtime-environment.ts.
if (!isExpoGo) {
  SplashScreen.preventAutoHideAsync().catch(() => undefined)
}

function NotificationResponseHandler() {
  useNotificationResponse()
  return null
}

function DeepLinkGuardHandler() {
  useDeepLinkGuard()
  return null
}

function RootLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  return (
    <AppProviders>
      <StartupCoordinator>
        <NotificationResponseHandler />
        <DeepLinkGuardHandler />
        <Stack
          initialRouteName="auth"
          screenOptions={{
            headerStyle: { backgroundColor: theme.brand },
            headerTitleStyle: { color: theme.textOnBrand, fontWeight: '600', fontSize: 18 },
            headerTintColor: theme.textOnBrand,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="connect-bank" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="obligation/[id]" options={{ title: t('obligationDetail.title') }} />
          <Stack.Screen
            name="settings/index"
            options={{ title: t('navigation.settings'), presentation: 'modal' }}
          />
          <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
          <Stack.Screen name="+not-found" options={{ title: t('navigation.notFound') }} />
        </Stack>
        <StatusBar style="auto" />
      </StartupCoordinator>
    </AppProviders>
  )
}

// Sentry.wrap adds the root error boundary + touch-event breadcrumbs; it only
// reports anywhere once initSentry() above has actually called Sentry.init.
export default Sentry.wrap(RootLayout)
