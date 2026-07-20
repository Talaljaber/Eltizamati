import { Stack } from 'expo-router'

/**
 * SCR-AUTH-* stack — reachable from onboarding's account step and, later,
 * Settings. No native header: each screen owns its own title and provides
 * its own "back to sign in" text link, matching a chromeless auth-screen
 * pattern (no redundant title bar stacked on top of the in-screen one).
 */
export default function AuthLayout() {
  return (
    <Stack initialRouteName="sign-in" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify-code" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="reset" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="update-password" />
      <Stack.Screen name="account-deleted" />
    </Stack>
  )
}
