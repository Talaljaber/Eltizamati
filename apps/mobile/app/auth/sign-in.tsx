import { useState } from 'react'
import { Alert, Image, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ErrorState, Text, space, useTheme } from '@/core/design-system'
import { useSignInMutation } from '@/features/auth/api/use-auth-mutations'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { beginOtpOperation, finishOtpOperation } from '@/features/auth/stores/otp-attempt-store'
import { useEntryCompletion } from '@/features/consent/hooks/use-entry-completion'
import { normalizeAuthEmail } from '@/services/auth/auth-email'
import logo from '../../assets/logo-cropped.png'

export default function SignInScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState(false)
  const [entryError, setEntryError] = useState<string>()
  const signIn = useSignInMutation(useAuthService())
  const { completeDemoEntry, completePersonalEntry } = useEntryCompletion()

  async function submit(): Promise<void> {
    const normalizedEmail = normalizeAuthEmail(email)
    const invalid = normalizedEmail === undefined || password.length === 0
    setValidationError(invalid)
    setEntryError(undefined)
    if (invalid || !beginOtpOperation('requesting')) return
    try {
      const session = await signIn.mutateAsync({ email: normalizedEmail, password })
      const completion = await completePersonalEntry(session)
      if (!completion.ok) setEntryError(t(completion.error.userMessageKey))
    } catch {
      // The typed mutation error remains visible below.
    } finally {
      finishOtpOperation()
    }
  }

  async function continueInDemo(): Promise<void> {
    const result = await completeDemoEntry()
    if (!result.ok) setEntryError(t(result.error.userMessageKey))
  }

  function showPreviewOnly(method: 'faceId' | 'sanad'): void {
    Alert.alert(t(`auth.${method}`), t('auth.previewOnlyMessage'))
  }

  const error = signIn.error ?? undefined
  const offline = error?.code === 'connectivity'
  const errorKey =
    error?.code === 'rateLimited'
      ? 'auth.tooManyAttempts'
      : error?.safeMetadata?.reason === 'email_not_confirmed'
        ? 'auth.emailNotVerified'
        : error?.safeMetadata?.reason === 'invalid_credentials'
          ? 'auth.invalidCredentials'
          : (error?.userMessageKey ?? 'error.auth')

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {offline ? (
        <ErrorState
          state={{ kind: 'offline' }}
          onRetry={() => void submit()}
          testID="sign-in-offline"
        />
      ) : (
        <DismissKeyboardView style={styles.content}>
          <View style={styles.top}>
            <Image
              source={logo}
              style={styles.logo}
              accessibilityIgnoresInvertColors
              accessibilityLabel={t('common.appName', 'Eltizamati')}
              resizeMode="contain"
            />
            <Text variant="title" align="center">
              {t('auth.signInTitle')}
            </Text>
            <View style={styles.form}>
              <AuthTextField
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                editable={!signIn.isPending}
                testID="sign-in-email"
              />
              <AuthTextField
                label={t('auth.passwordLabel')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                autoComplete="current-password"
                editable={!signIn.isPending}
                testID="sign-in-password"
              />
              {validationError ? (
                <Text variant="bodySmall" color="critical" testID="sign-in-validation-error">
                  {t('auth.signInValidation')}
                </Text>
              ) : null}
              {error !== undefined && !offline ? (
                <Text variant="bodySmall" color="critical" testID="sign-in-error">
                  {t(errorKey)}
                </Text>
              ) : null}
              {entryError !== undefined ? (
                <Text variant="bodySmall" color="critical" testID="sign-in-entry-error">
                  {entryError}
                </Text>
              ) : null}
              <Button
                variant="primary"
                label={t('auth.signIn')}
                loading={signIn.isPending}
                disabled={email.trim() === '' || password === '' || signIn.isPending}
                onPress={() => void submit()}
                testID="sign-in-submit"
              />
              <View style={styles.alternativeMethods}>
                <Text variant="bodySmall" color="secondary" align="center">
                  {t('auth.otherSignInMethods')}
                </Text>
                <Button
                  variant="secondary"
                  label={t('auth.faceId')}
                  onPress={() => showPreviewOnly('faceId')}
                  testID="sign-in-face-id"
                />
                <Button
                  variant="secondary"
                  label={t('auth.sanad')}
                  onPress={() => showPreviewOnly('sanad')}
                  testID="sign-in-sanad"
                />
                <Text variant="bodySmall" color="secondary" align="center">
                  {t('auth.previewOnlyLabel')}
                </Text>
              </View>
              <Button
                variant="ghost"
                label={t('auth.createAccount')}
                onPress={() => router.push('/auth/sign-up')}
                testID="sign-in-create-account"
              />
            </View>
          </View>
          <View style={styles.bottom}>
            <Button
              variant="secondary"
              label={t('auth.continueInDemoMode')}
              onPress={() => void continueInDemo()}
              testID="sign-in-continue-demo"
            />
          </View>
        </DismissKeyboardView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', padding: space[6] },
  top: { gap: space[4] },
  logo: { width: 152, height: 64, alignSelf: 'center' },
  form: { gap: space[3] },
  alternativeMethods: { gap: space[2], paddingTop: space[1] },
  bottom: { gap: space[3] },
})
