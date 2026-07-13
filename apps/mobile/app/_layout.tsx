import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { useTranslation } from 'react-i18next'
import { AppProviders } from '../src/providers'
import { OnboardingGuard } from '../src/features/demo/components/OnboardingGuard'
import '../src/i18n' // Initialize i18n
import { getNotificationRoute } from '../src/services/local-notification-service'

function NotificationResponseHandler() {
  const router = useRouter()

  useEffect(() => {
    const openResponse = (response: Notifications.NotificationResponse | null) => {
      if (response === null) return
      const route = getNotificationRoute(response.notification.request.content.data)
      if (route !== undefined) router.push(route)
    }
    void Notifications.getLastNotificationResponseAsync().then(openResponse)
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse)
    return () => subscription.remove()
  }, [router])

  return null
}

export default function RootLayout() {
  const { t } = useTranslation()
  return (
    <AppProviders>
      <NotificationResponseHandler />
      <OnboardingGuard>
        <Stack>
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
