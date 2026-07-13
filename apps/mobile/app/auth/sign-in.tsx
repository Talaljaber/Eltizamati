/**
 * SCR-AUTH-SIGNIN — sign in an existing personal-mode user.
 * States: L (submitting) · ER (invalid credentials/unverified email/network,
 * inline w/ retry) · OF (offline — full-screen, personal mode needs a
 * connection). Primary: sign in. Secondary: continue in demo mode (always
 * available), links to sign-up and reset.
 */
import { useState } from 'react'
import { View, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { brandId } from '@eltizamati/domain'
import { Text, Button, ErrorState, space, useTheme } from '@/core/design-system'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { useAuthService, useConsentRepository } from '@/features/auth/hooks/use-auth-service'
import { useSignInMutation } from '@/features/auth/api/use-auth-mutations'
import { useRecordConsentMutation } from '@/features/auth/api/use-record-consent'
import { setOnboardingComplete, setDataMode } from '@/features/demo/stores/demo-mode-store'
import { useDemoBoot, usePersonalBoot } from '@/providers'
import logo from '../../assets/logo-cropped.png'

export default function SignInScreen() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const bootDemoMode = useDemoBoot()
  const bootPersonalMode = usePersonalBoot()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Covers the whole submit chain (both mutations + the boot sequence), not
  // just signIn's own pending state — without this, the button stops
  // spinning as soon as signIn resolves even though recordConsent and the
  // mode boot are still in flight, making the screen look idle/stuck with
  // no feedback for however long the rest of the chain takes.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const authServiceResult = useAuthService()
  const consentRepositoryResult = useConsentRepository()
  const signIn = useSignInMutation(authServiceResult)
  const recordConsent = useRecordConsentMutation(consentRepositoryResult)

  async function handleSubmit() {
    setSubmitError(undefined)
    setIsSubmitting(true)
    try {
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
        // Signed in successfully, but couldn't record consent — must be
        // visible (previously failed silently here, leaving the screen
        // looking stuck with no explanation).
        setSubmitError(t('auth.signInConsentFailed'))
        return
      }
      await setDataMode('personal')
      await bootPersonalMode()
      await setOnboardingComplete()
      router.replace('/(tabs)/')
    } finally {
      setIsSubmitting(false)
    }
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
        <DismissKeyboardView style={styles.content}>
          <View style={styles.top}>
            <View style={styles.brand}>
              <Image
                source={logo}
                style={styles.logo}
                accessibilityIgnoresInvertColors
                accessibilityLabel={t('common.appName', 'Eltizamati')}
                resizeMode="contain"
              />
            </View>

            <Text variant="title">{t('auth.signInTitle')}</Text>

            <View style={styles.form}>
              <AuthTextField
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSubmitting}
                testID="sign-in-email"
              />
              <AuthTextField
                label={t('auth.passwordLabel')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                editable={!isSubmitting}
                testID="sign-in-password"
              />

              {error !== undefined ? (
                <Text variant="bodySmall" color="critical" testID="sign-in-error">
                  {t(error.userMessageKey)}
                </Text>
              ) : null}
              {submitError !== undefined ? (
                <Text variant="bodySmall" color="critical" testID="sign-in-submit-error">
                  {submitError}
                </Text>
              ) : null}

              <Text
                variant="bodySmall"
                color="brand"
                align="end"
                onPress={() => router.push('/auth/reset')}
                testID="sign-in-forgot-password"
              >
                {t('auth.forgotPassword')}
              </Text>

              <Button
                variant="primary"
                label={t('auth.signInButton')}
                loading={isSubmitting}
                disabled={email === '' || password === ''}
                onPress={() => {
                  void handleSubmit()
                }}
                testID="sign-in-submit"
              />
            </View>
          </View>

          <View style={styles.bottom}>
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

            <Button
              variant="ghost"
              label={t('auth.continueInDemoMode')}
              onPress={() => {
                void handleContinueInDemoMode()
              }}
              testID="sign-in-continue-demo"
            />

            <Text
              variant="bodySmall"
              color="secondary"
              align="center"
              onPress={() => router.push('/onboarding/language')}
              testID="sign-in-take-tour"
            >
              {t('auth.takeTour')}
            </Text>
          </View>
        </DismissKeyboardView>
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
    justifyContent: 'space-between',
  },
  top: {
    gap: space[6],
  },
  brand: {
    alignItems: 'center',
    marginBottom: space[2],
  },
  logo: {
    width: '100%',
    maxWidth: 200,
    aspectRatio: 745 / 189,
  },
  form: {
    gap: space[3],
  },
  bottom: {
    gap: space[3],
  },
  linkRow: {
    flexDirection: 'row',
    gap: space[1],
    justifyContent: 'center',
  },
})
