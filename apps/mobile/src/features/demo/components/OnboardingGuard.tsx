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
      const _mode = await getDataMode()

      const inOnboardingGroup = segments[0] === 'onboarding'

      if (!isComplete && !inOnboardingGroup) {
        // Redirect to onboarding if not complete
        router.replace('/onboarding/language')
      } else if (isComplete && inOnboardingGroup) {
        // Redirect to main app if onboarding is already complete
        router.replace('/(tabs)/')
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
