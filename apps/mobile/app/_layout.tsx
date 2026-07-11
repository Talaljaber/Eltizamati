import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useTranslation } from 'react-i18next'
import '../src/i18n' // Initialize i18n

export default function RootLayout() {
  const { t } = useTranslation()
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ title: t('navigation.settings'), presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ title: t('navigation.notFound') }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}
