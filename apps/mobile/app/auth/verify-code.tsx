import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Button,
  ErrorState,
  Text,
  space,
  layout,
  useTheme,
  useResponsiveLayout,
} from '@/core/design-system'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { SIGNUP_EMAIL_OTP_LENGTH } from '@/services/auth/auth-service'
import { useEntryCompletion } from '@/features/consent/hooks/use-entry-completion'
import {
  useResendSignupOtpMutation,
  useVerifySignupOtpMutation,
} from '@/features/auth/api/use-auth-mutations'
import {
  beginOtpOperation,
  clearOtpAttempt,
  finishOtpOperation,
  markOtpResent,
  useOtpAttempt,
} from '@/features/auth/stores/otp-attempt-store'

function verificationErrorKey(error: {
  readonly code: string
  readonly safeMetadata?: Record<string, string | number | boolean>
}): string {
  if (error.code === 'rateLimited') return 'auth.tooManyAttempts'
  if (error.code === 'connectivity') return 'error.connectivity'
  if (error.safeMetadata?.otpFailure === 'expired') return 'auth.codeExpired'
  if (error.safeMetadata?.otpFailure === 'invalid') return 'auth.codeInvalid'
  return 'auth.verifyCodeFailed'
}

export default function VerifyCodeScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { isWideWeb } = useResponsiveLayout()
  const attempt = useOtpAttempt()
  const authService = useAuthService()
  const { completePersonalEntry, resumePersonalEntry } = useEntryCompletion()
  const verifyOtp = useVerifySignupOtpMutation(authService)
  const requestOtp = useResendSignupOtpMutation(authService)
  const [code, setCode] = useState('')
  const [now, setNow] = useState(Date.now())
  const [entryError, setEntryError] = useState<string>()
  const [entryDiagnostic, setEntryDiagnostic] = useState<string>()
  const [resendSucceeded, setResendSucceeded] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (attempt === undefined) return <Redirect href="/auth/sign-in" />
  const activeAttempt = attempt

  const secondsRemaining = Math.max(0, Math.ceil((activeAttempt.resendAvailableAt - now) / 1000))
  const busy =
    verifyOtp.isPending ||
    requestOtp.isPending ||
    attempt.operation === 'verifying' ||
    attempt.operation === 'resending'
  const activeError = verifyOtp.error ?? requestOtp.error ?? undefined
  const emailVerified = verifyOtp.data !== undefined
  const offline = activeError?.code === 'connectivity'

  async function enterPersonalMode(session: {
    readonly user: { readonly id: string; readonly email: string | undefined }
    readonly expiresAt: number | undefined
  }): Promise<void> {
    const result = await completePersonalEntry(session, activeAttempt.profile)
    if (!result.ok) {
      setEntryError(t(result.error.userMessageKey))
      setEntryDiagnostic(
        JSON.stringify({ code: result.error.code, safeMetadata: result.error.safeMetadata }),
      )
      return
    }
    clearOtpAttempt()
  }

  async function verify(): Promise<void> {
    if (code.length !== SIGNUP_EMAIL_OTP_LENGTH || !beginOtpOperation('verifying')) return
    setEntryError(undefined)
    setEntryDiagnostic(undefined)
    setResendSucceeded(false)
    try {
      const session = await verifyOtp.mutateAsync({
        email: activeAttempt.normalizedEmail,
        code,
      })
      await enterPersonalMode(session)
    } catch {
      // The typed mutation error remains visible without leaving this screen.
    } finally {
      finishOtpOperation()
    }
  }

  async function resend(): Promise<void> {
    if (secondsRemaining > 0 || !beginOtpOperation('resending')) return
    try {
      await requestOtp.mutateAsync(activeAttempt.normalizedEmail)
      markOtpResent()
      setCode('')
      setResendSucceeded(true)
      setNow(Date.now())
    } catch {
      // The typed mutation error remains visible.
    } finally {
      finishOtpOperation()
    }
  }

  async function retryEntry(): Promise<void> {
    if (!beginOtpOperation('verifying')) return
    setEntryError(undefined)
    try {
      if (verifyOtp.data !== undefined) {
        await enterPersonalMode(verifyOtp.data)
        return
      }
      const result = await resumePersonalEntry(activeAttempt.profile)
      if (!result.ok) {
        setEntryError(t(result.error.userMessageKey))
        setEntryDiagnostic(
          JSON.stringify({ code: result.error.code, safeMetadata: result.error.safeMetadata }),
        )
        return
      }
      clearOtpAttempt()
    } catch {
      setEntryError(t('error.unexpected'))
    } finally {
      finishOtpOperation()
    }
  }

  function changeEmail(): void {
    clearOtpAttempt()
    router.back()
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {offline ? (
        <ErrorState
          state={{ kind: 'offline' }}
          onRetry={() => {
            void (verifyOtp.error ? verify() : resend())
          }}
          testID="verify-code-offline"
        />
      ) : (
        <DismissKeyboardView style={[styles.content, isWideWeb && styles.contentWide]}>
          <View style={styles.header}>
            <Text variant="title" align="center">
              {t('auth.verifyCodeTitle')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {t('auth.verifyCodeBody', { email: activeAttempt.maskedEmail })}
            </Text>
          </View>
          <View style={styles.form}>
            {emailVerified ? (
              <Text variant="body" align="center" testID="verify-code-email-verified">
                {t('auth.emailVerifiedSavingPending')}
              </Text>
            ) : null}
            {!emailVerified ? (
              <>
                <AuthTextField
                  label={t('auth.codeLabel')}
                  value={code}
                  onChangeText={(value) =>
                    setCode(value.replace(/\D/g, '').slice(0, SIGNUP_EMAIL_OTP_LENGTH))
                  }
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={SIGNUP_EMAIL_OTP_LENGTH}
                  editable={!busy}
                  accessibilityLabel={t('auth.codeAccessibilityLabel')}
                  style={styles.codeInput}
                  testID="verify-code-input"
                />
                {resendSucceeded ? (
                  <Text variant="bodySmall" color="secondary" testID="verify-code-resend-success">
                    {t('auth.codeResent')}
                  </Text>
                ) : null}
              </>
            ) : null}
            {activeError !== undefined && !offline ? (
              <Text variant="bodySmall" color="critical" testID="verify-code-error">
                {t(
                  activeError === requestOtp.error
                    ? activeError.code === 'rateLimited'
                      ? 'auth.emailRateLimited'
                      : 'auth.resendCodeFailed'
                    : verificationErrorKey(activeError),
                )}
              </Text>
            ) : null}
            {entryError !== undefined ? (
              <View style={styles.entryError}>
                <Text variant="bodySmall" color="critical" testID="verify-code-entry-error">
                  {entryError}
                </Text>
                <Button
                  variant="ghost"
                  label={t('common.retry')}
                  disabled={busy}
                  onPress={() => {
                    void retryEntry()
                  }}
                  testID="verify-code-entry-retry"
                />
              </View>
            ) : null}
            {__DEV__ && entryDiagnostic !== undefined ? (
              <Text variant="caption" color="secondary" testID="verify-code-debug-diagnostic">
                {`Debug: ${entryDiagnostic}`}
              </Text>
            ) : null}
            {!emailVerified ? (
              <Button
                variant="primary"
                label={t('auth.verifyCode')}
                loading={verifyOtp.isPending}
                disabled={code.length !== SIGNUP_EMAIL_OTP_LENGTH || busy}
                onPress={() => {
                  void verify()
                }}
                testID="verify-code-submit"
              />
            ) : null}
            {!emailVerified ? (
              <Button
                variant="secondary"
                label={
                  secondsRemaining > 0
                    ? t('auth.resendCountdown', { seconds: secondsRemaining })
                    : t('auth.resendCode')
                }
                loading={requestOtp.isPending}
                disabled={secondsRemaining > 0 || busy}
                onPress={() => {
                  void resend()
                }}
                testID="verify-code-resend"
              />
            ) : null}
            <Button
              variant="ghost"
              label={t('auth.changeEmail')}
              disabled={busy}
              onPress={changeEmail}
              testID="verify-code-change-email"
            />
          </View>
        </DismissKeyboardView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: space[6],
    paddingHorizontal: space[6],
    paddingVertical: space[6],
  },
  contentWide: { width: '100%', maxWidth: layout.readableMaxWidth, alignSelf: 'center' },
  header: { gap: space[3] },
  form: { gap: space[3] },
  entryError: { gap: space[2] },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    writingDirection: 'ltr',
  },
})
