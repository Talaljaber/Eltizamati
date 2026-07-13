import { Stack } from 'expo-router'

/**
 * Onboarding stack layout — Phase 5.
 * All screens here are reachable only when onboarding is not yet complete.
 * Transition is replaced by the root layout once onboarding is done.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="language" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="consent" />
      <Stack.Screen name="mode" />
    </Stack>
  )
}
