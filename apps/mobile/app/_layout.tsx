import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useTranslation } from 'react-i18next'
import { AppProviders } from '../src/providers'
import { OnboardingGuard } from '../src/features/demo/components/OnboardingGuard'
import '../src/i18n' // Initialize i18n
import { useNotificationResponse } from '../src/features/notifications/hooks/use-notification-response'
import { useTheme } from '../src/core/design-system'

function NotificationResponseHandler() {
  useNotificationResponse()
  return null
}

export default function RootLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  return (
    <AppProviders>
      <NotificationResponseHandler />
      <OnboardingGuard>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.brand },
            headerTitleStyle: { color: theme.textOnBrand, fontWeight: '600' },
            headerTintColor: theme.textOnBrand,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="obligation/[id]" options={{ title: t('obligationDetail.title') }} />
          <Stack.Screen
            name="settings/index"
            options={{ title: t('navigation.settings'), presentation: 'modal' }}
          />
          <Stack.Screen name="+not-found" options={{ title: t('navigation.notFound') }} />
        </Stack>
        <StatusBar style="auto" />
      </OnboardingGuard>
    </AppProviders>
  )
}
