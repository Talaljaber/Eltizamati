/**
 * SCR-AUTH-CALLBACK — receives the deep link Supabase's confirmation/reset
 * emails point at (built in supabase-auth-service.ts's authCallbackUrl).
 * Delegates the actual token/code exchange to AuthService.exchangeCallbackUrl
 * (kept behind the port so this route never touches supabase-js directly),
 * then continues the same personal-mode boot sequence sign-in/sign-up use.
 */
import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, EmptyState, space, useTheme } from '@/core/design-system'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { setOnboardingComplete, setDataMode } from '@/features/demo/stores/demo-mode-store'
import { usePersonalBoot } from '@/providers'

export default function AuthCallbackScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const bootPersonalMode = usePersonalBoot()
  const authServiceResult = useAuthService()
  const url = Linking.useURL()
  const [failed, setFailed] = useState(false)
  const handled = useRef(false)

  useEffect(() => {
    if (url === null || handled.current || !authServiceResult.ok) return
    handled.current = true

    async function complete(currentUrl: string) {
      if (!authServiceResult.ok) return
      const result = await authServiceResult.value.exchangeCallbackUrl(currentUrl)
      if (!result.ok) {
        setFailed(true)
        return
      }
      await setDataMode('personal')
      await bootPersonalMode()
      await setOnboardingComplete()
      router.replace('/(tabs)/')
    }

    void complete(url)
  }, [url, authServiceResult, bootPersonalMode, router])

  if (failed) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <EmptyState
          title={t('auth.callbackErrorTitle')}
          subtitle={t('auth.callbackErrorBody')}
          ctaLabel={t('auth.callbackBackToSignIn')}
          onCta={() => router.replace('/auth/sign-in')}
          testID="auth-callback-error"
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.content} testID="auth-callback-pending">
        <ActivityIndicator color={theme.brand} />
        <Text variant="body" color="secondary" align="center">
          {t('auth.callbackPending')}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[6],
  },
})
