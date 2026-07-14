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
import { useEntryCompletion } from '@/features/consent/hooks/use-entry-completion'

export default function AuthCallbackScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { completePersonalEntry } = useEntryCompletion()
  const authServiceResult = useAuthService()
  const url = Linking.useURL()
  const [failed, setFailed] = useState(false)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    let active = true

    async function complete() {
      const currentUrl = url ?? (await Linking.getInitialURL())
      if (!active) return
      if (currentUrl === null || !authServiceResult.ok) {
        setFailed(true)
        return
      }
      const result = await authServiceResult.value.exchangeCallbackUrl(currentUrl)
      if (!active) return
      if (!result.ok) {
        setFailed(true)
        return
      }
      if (result.value.kind === 'passwordRecovery') {
        router.replace('/auth/update-password')
        return
      }
      const completion = await completePersonalEntry(result.value.session)
      if (!completion.ok) setFailed(true)
    }

    void complete()
    return () => {
      active = false
    }
  }, [url, authServiceResult, completePersonalEntry, router])

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
