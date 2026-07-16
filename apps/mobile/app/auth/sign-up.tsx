import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ErrorState, Text, space, useTheme } from '@/core/design-system'
import { useSignUpMutation } from '@/features/auth/api/use-auth-mutations'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { normalizeSignupProfile } from '@/features/auth/services/signup-profile'
import {
  beginOtpOperation,
  finishOtpOperation,
  startOtpAttempt,
} from '@/features/auth/stores/otp-attempt-store'
import { normalizeAuthEmail } from '@/services/auth/auth-email'

export default function SignUpScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const signUp = useSignUpMutation(useAuthService())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [primaryBank, setPrimaryBank] = useState('')
  const [validationError, setValidationError] = useState<string>()

  async function submit(): Promise<void> {
    const normalizedEmail = normalizeAuthEmail(email)
    const profile = normalizeSignupProfile({ fullName, phoneNumber, primaryBank })
    const errorKey =
      normalizedEmail === undefined
        ? 'auth.invalidEmail'
        : password.length < 12
          ? 'auth.passwordRequirements'
          : password !== confirmPassword
            ? 'auth.passwordMismatch'
            : profile === undefined
              ? 'auth.profileValidation'
              : undefined
    setValidationError(errorKey)
    if (errorKey !== undefined || normalizedEmail === undefined || profile === undefined) return
    if (!beginOtpOperation('requesting')) return
    try {
      await signUp.mutateAsync({ email: normalizedEmail, password })
      startOtpAttempt(normalizedEmail, profile)
      router.push('/auth/verify-code')
    } catch {
      // The typed mutation error remains visible below.
    } finally {
      finishOtpOperation()
    }
  }

  const error = signUp.error ?? undefined
  const offline = error?.code === 'connectivity'
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {offline ? (
        <ErrorState state={{ kind: 'offline' }} onRetry={() => void submit()} />
      ) : (
        <DismissKeyboardView style={styles.content}>
          <Text variant="title" align="center">
            {t('auth.signUpTitle')}
          </Text>
          <View style={styles.form}>
            <AuthTextField
              label={t('auth.fullName')}
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              testID="sign-up-full-name"
            />
            <AuthTextField
              label={t('auth.phoneNumber')}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              testID="sign-up-phone"
            />
            <AuthTextField
              label={t('auth.primaryBank')}
              value={primaryBank}
              onChangeText={setPrimaryBank}
              testID="sign-up-bank"
            />
            <AuthTextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              testID="sign-up-email"
            />
            <AuthTextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              testID="sign-up-password"
            />
            <AuthTextField
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              testID="sign-up-confirm-password"
            />
            {validationError !== undefined ? (
              <Text variant="bodySmall" color="critical" testID="sign-up-validation-error">
                {t(validationError)}
              </Text>
            ) : null}
            {error !== undefined && !offline ? (
              <Text variant="bodySmall" color="critical" testID="sign-up-error">
                {t(error.code === 'rateLimited' ? 'auth.emailRateLimited' : 'auth.signUpFailed')}
              </Text>
            ) : null}
            <Button
              variant="primary"
              label={t('auth.createAccount')}
              loading={signUp.isPending}
              disabled={signUp.isPending}
              onPress={() => void submit()}
              testID="sign-up-submit"
            />
            <Button
              variant="ghost"
              label={t('auth.backToSignIn')}
              onPress={() => router.back()}
            />
          </View>
        </DismissKeyboardView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: space[5], padding: space[6] },
  form: { gap: space[3] },
})
