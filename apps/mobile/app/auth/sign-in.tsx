/**
 * SCR-AUTH-SIGNIN — sign in an existing personal-mode user.
 * States: L (submitting) · ER (invalid credentials/unverified email/network,
 * inline w/ retry) · OF (offline — full-screen, personal mode needs a
 * connection). Primary: sign in. Secondary: continue in demo mode (always
 * available), links to sign-up and reset.
 */
import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { brandId } from '@eltizamati/domain'
import { Text, Button, ErrorState, space, useTheme } from '@/core/design-system'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { useAuthService, useConsentRepository } from '@/features/auth/hooks/use-auth-service'
import { useSignInMutation } from '@/features/auth/api/use-auth-mutations'
import { useRecordConsentMutation } from '@/features/auth/api/use-record-consent'
import { setOnboardingComplete, setDataMode } from '@/features/demo/stores/demo-mode-store'
import { useDemoBoot, usePersonalBoot } from '@/providers'

export default function SignInScreen() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const bootDemoMode = useDemoBoot()
  const bootPersonalMode = usePersonalBoot()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const authServiceResult = useAuthService()
  const consentRepositoryResult = useConsentRepository()
  const signIn = useSignInMutation(authServiceResult)
  const recordConsent = useRecordConsentMutation(consentRepositoryResult)

  async function handleSubmit() {
    let session
    try {
      session = await signIn.mutateAsync({ email, password })
    } catch {
      // Already captured in signIn.error — rendered below. mutateAsync
      // rethrows by design; the UI reacts to mutation state, not this catch.
      return
    }
    try {
      await recordConsent.mutateAsync({
        userId: brandId(session.user.id),
        locale: i18n.language === 'ar' ? 'ar' : 'en',
      })
    } catch {
      // Already captured in recordConsent.error — same convention as
      // signIn above: don't navigate on failure.
      return
    }
    await setDataMode('personal')
    await bootPersonalMode()
    await setOnboardingComplete()
    router.replace('/(tabs)/')
  }

  async function handleContinueInDemoMode() {
    await setDataMode('demo')
    await setOnboardingComplete()
    await bootDemoMode()
    router.replace('/(tabs)/')
  }

  const error = signIn.error ?? undefined
  const isOffline = error !== undefined && error.code === 'connectivity'

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {isOffline ? (
        <ErrorState
          state={{ kind: 'offline' }}
          onRetry={() => {
            void handleSubmit()
          }}
          testID="sign-in-offline"
        />
      ) : (
        <View style={styles.content}>
          <Text variant="title" align="center">
            {t('auth.signInTitle')}
          </Text>

          <View style={styles.form}>
            <AuthTextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!signIn.isPending}
              testID="sign-in-email"
            />
            <AuthTextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
              editable={!signIn.isPending}
              testID="sign-in-password"
            />

            {error !== undefined ? (
              <Text variant="bodySmall" color="critical" testID="sign-in-error">
                {t(error.userMessageKey)}
              </Text>
            ) : null}

            <Button
              variant="primary"
              label={t('auth.signInButton')}
              loading={signIn.isPending}
              disabled={email === '' || password === ''}
              onPress={() => {
                void handleSubmit()
              }}
              testID="sign-in-submit"
            />
          </View>

          <View style={styles.links}>
            <Text
              variant="bodySmall"
              color="brand"
              align="center"
              onPress={() => router.push('/auth/reset')}
              testID="sign-in-forgot-password"
            >
              {t('auth.forgotPassword')}
            </Text>
            <View style={styles.linkRow}>
              <Text variant="bodySmall" color="secondary">
                {t('auth.signInNoAccount')}
              </Text>
              <Text
                variant="bodySmall"
                color="brand"
                onPress={() => router.push('/auth/sign-up')}
                testID="sign-in-create-account"
              >
                {t('auth.signInCreateAccount')}
              </Text>
            </View>
          </View>

          <Button
            variant="ghost"
            label={t('auth.continueInDemoMode')}
            onPress={() => {
              void handleContinueInDemoMode()
            }}
            testID="sign-in-continue-demo"
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: space[6],
    paddingVertical: space[6],
    justifyContent: 'center',
    gap: space[6],
  },
  form: {
    gap: space[4],
  },
  links: {
    gap: space[3],
    alignItems: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    gap: space[1],
    justifyContent: 'center',
  },
})
