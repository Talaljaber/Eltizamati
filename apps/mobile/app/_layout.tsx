import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import '../src/i18n' // Initialize i18n

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}
