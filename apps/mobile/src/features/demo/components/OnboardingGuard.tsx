import { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { getOnboardingComplete, getDataMode } from '../stores/demo-mode-store'
import { useTheme } from '@/core/design-system'

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const segments = useSegments()
  const theme = useTheme()

  useEffect(() => {
    async function checkState() {
      const isComplete = await getOnboardingComplete()
      const mode = await getDataMode()

      const inOnboardingGroup = segments[0] === 'onboarding'
      // The account step (FR-ONB-006) leaves the onboarding route group for
      // /auth/* before onboarding is marked complete — without this, the
      // guard would bounce the user straight back to /onboarding/language.
      const inAuthGroup = segments[0] === 'auth'

      // Onboarding marked complete without a data mode is a poisoned state (an
      // earlier auth-screen bug wrote onboardingComplete without setDataMode):
      // the tab screens depend on a repository family being booted and crash
      // without it, so treat it as incomplete and re-run mode selection.
      const effectivelyComplete = isComplete && mode !== null

      if (!effectivelyComplete && !inOnboardingGroup && !inAuthGroup) {
        // Redirect to onboarding. Deliberately do NOT setIsReady here:
        // navigation is async, and revealing children now would render the
        // navigator's current route (the demo-only tabs) for at least one
        // commit before the redirect lands — crashing on useRepositories.
        // The effect re-runs when `segments` changes; the post-navigation run
        // finds a consistent state and sets ready.
        router.replace('/onboarding/welcome')
        return
      }
      if (effectivelyComplete && inOnboardingGroup) {
        // Same reasoning: don't reveal children until the redirect lands.
        router.replace('/(tabs)/')
        return
      }

      setIsReady(true)
    }

    void checkState()
  }, [segments, router])

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.brand} />
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
