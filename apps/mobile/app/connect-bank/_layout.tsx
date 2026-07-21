import { Stack } from 'expo-router'

/**
 * "Pull obligations from your bank" onboarding stack (connect-plan.md Phase
 * E). `gestureEnabled: false` matches `onboarding/_layout.tsx` — a swipe-back
 * mid-flow would leave the flow store in a half-finished state.
 */
export default function ConnectBankLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, gestureEnabled: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="select" />
      <Stack.Screen name="done" />
    </Stack>
  )
}
