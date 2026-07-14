/**
 * SCR-AUTH-SIGNUP — email sign-up with verification.
 * States: L (submitting) · ER (email in use/weak password/network, inline
 * w/ retry) · OF (offline — full-screen) · verification-pending (w/ resend).
 * Primary: create account → verification-pending state.
 */
import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, EmptyState, ErrorState, space, useTheme } from '@/core/design-system'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { useSignUpMutation } from '@/features/auth/api/use-auth-mutations'
import { useEntryCompletion } from '@/features/consent/hooks/use-entry-completion'

export default function SignUpScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { completePersonalEntry } = useEntryCompletion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationPending, setVerificationPending] = useState(false)
  // Covers the whole submit chain (both mutations + the boot sequence), not
  // just signUp's own pending state — see sign-in.tsx for why.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const authServiceResult = useAuthService()
  const signUp = useSignUpMutation(authServiceResult)

  async function handleSubmit() {
    setSubmitError(undefined)
    setIsSubmitting(true)
    try {
      let session
      try {
        session = await signUp.mutateAsync({ email, password })
      } catch {
        // Already captured in signUp.error — rendered below.
        return
      }
      if (session === undefined) {
        // Email verification required — no session yet (BR: never invent one).
        setVerificationPending(true)
        return
      }
      const completion = await completePersonalEntry(session)
      if (!completion.ok) {
        // Signed up successfully, but couldn't record consent — must be
        // visible, not a silent dead end.
        setSubmitError(t('auth.signInConsentFailed'))
        return
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const error = signUp.error ?? undefined
  const isOffline = error !== undefined && error.code === 'connectivity'

  if (verificationPending) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <EmptyState
          title={t('auth.signUpVerificationPendingTitle')}
          subtitle={t('auth.signUpVerificationPendingBody', { email })}
          ctaLabel={t('auth.signUpBackToSignIn')}
          onCta={() => router.replace('/auth/sign-in')}
          testID="sign-up-verification-pending"
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {isOffline ? (
        <ErrorState
          state={{ kind: 'offline' }}
          onRetry={() => {
            void handleSubmit()
          }}
          testID="sign-up-offline"
        />
      ) : (
        <DismissKeyboardView style={styles.content}>
          <Text variant="title" align="center">
            {t('auth.signUpTitle')}
          </Text>

          <View style={styles.form}>
            <AuthTextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isSubmitting}
              testID="sign-up-email"
            />
            <AuthTextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
              editable={!isSubmitting}
              testID="sign-up-password"
            />

            {error !== undefined ? (
              <Text variant="bodySmall" color="critical" testID="sign-up-error">
                {t(error.userMessageKey)}
              </Text>
            ) : null}
            {submitError !== undefined ? (
              <Text variant="bodySmall" color="critical" testID="sign-up-submit-error">
                {submitError}
              </Text>
            ) : null}

            <Button
              variant="primary"
              label={t('auth.signUpButton')}
              loading={isSubmitting}
              disabled={email === '' || password === ''}
              onPress={() => {
                void handleSubmit()
              }}
              testID="sign-up-submit"
            />
          </View>

          <View style={styles.linkRow}>
            <Text variant="bodySmall" color="secondary">
              {t('auth.signUpHaveAccount')}
            </Text>
            <Text
              variant="bodySmall"
              color="brand"
              onPress={() => router.replace('/auth/sign-in')}
              testID="sign-up-sign-in"
            >
              {t('auth.signUpSignIn')}
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
    justifyContent: 'center',
    gap: space[6],
  },
  form: {
    gap: space[4],
  },
  linkRow: {
    flexDirection: 'row',
    gap: space[1],
    justifyContent: 'center',
  },
})
