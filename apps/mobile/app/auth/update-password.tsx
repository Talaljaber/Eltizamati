import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, EmptyState, Text, space, useTheme } from '@/core/design-system'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { useUpdatePasswordMutation } from '@/features/auth/api/use-auth-mutations'
import { useEntryCompletion } from '@/features/consent/hooks/use-entry-completion'
import {
  validateRecoveredPassword,
  type PasswordValidationError,
} from '@/features/auth/services/password-recovery'
import type { AppAuthSession } from '@/services/auth/auth-service'

export default function UpdatePasswordScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const authServiceResult = useAuthService()
  const authService = authServiceResult.ok ? authServiceResult.value : undefined
  const updatePassword = useUpdatePasswordMutation(authServiceResult)
  const { completePersonalEntry } = useEntryCompletion()
  const [session, setSession] = useState<AppAuthSession | undefined>()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [validationError, setValidationError] = useState<PasswordValidationError>()
  const [completionFailed, setCompletionFailed] = useState(false)

  useEffect(() => {
    let active = true
    async function checkSession() {
      if (authService !== undefined) {
        const result = await authService.currentSession()
        if (active && result.ok) setSession(result.value)
      }
      if (active) setSessionChecked(true)
    }
    void checkSession()
    return () => {
      active = false
    }
  }, [authService])

  async function cancelRecovery() {
    if (authService !== undefined) await authService.clearLocalSession()
    router.replace('/auth/sign-in')
  }

  async function continueToApp() {
    if (session === undefined) return
    const result = await completePersonalEntry(session)
    if (!result.ok) setCompletionFailed(true)
  }

  function submit() {
    const error = validateRecoveredPassword(password, confirmation)
    setValidationError(error)
    if (error !== undefined) return
    updatePassword.mutate(password)
  }

  if (!sessionChecked) {
    return (
      <SafeAreaView style={[styles.root, styles.pending, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.brand} testID="update-password-session-pending" />
      </SafeAreaView>
    )
  }

  if (session === undefined) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <EmptyState
          title={t('auth.updatePasswordInvalidTitle')}
          subtitle={t('auth.updatePasswordInvalidBody')}
          ctaLabel={t('auth.callbackBackToSignIn')}
          onCta={() => router.replace('/auth/sign-in')}
          testID="update-password-invalid-session"
        />
      </SafeAreaView>
    )
  }

  if (updatePassword.isSuccess) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <EmptyState
          title={t('auth.updatePasswordSuccessTitle')}
          subtitle={t('auth.updatePasswordSuccessBody')}
          ctaLabel={t('common.continue')}
          onCta={() => {
            void continueToApp()
          }}
          testID="update-password-success"
        />
        {completionFailed ? (
          <Text variant="bodySmall" color="critical" align="center">
            {t('auth.signInConsentFailed')}
          </Text>
        ) : null}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <DismissKeyboardView style={styles.content}>
        <Text variant="title" align="center">
          {t('auth.updatePasswordTitle')}
        </Text>
        <Text variant="body" color="secondary" align="center">
          {t('auth.updatePasswordBody')}
        </Text>
        <View style={styles.form}>
          <AuthTextField
            label={t('auth.newPasswordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!updatePassword.isPending}
            testID="update-password-new"
          />
          <AuthTextField
            label={t('auth.confirmPasswordLabel')}
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            editable={!updatePassword.isPending}
            testID="update-password-confirm"
          />
          {validationError !== undefined ? (
            <Text variant="bodySmall" color="critical" testID="update-password-validation-error">
              {t(`auth.updatePassword${validationError === 'mismatch' ? 'Mismatch' : 'TooShort'}`)}
            </Text>
          ) : null}
          {updatePassword.error !== null ? (
            <Text variant="bodySmall" color="critical" testID="update-password-error">
              {t('auth.updatePasswordFailed')}
            </Text>
          ) : null}
          <Button
            variant="primary"
            label={t('auth.updatePasswordButton')}
            loading={updatePassword.isPending}
            disabled={!sessionChecked || password === '' || confirmation === ''}
            onPress={submit}
            testID="update-password-submit"
          />
          <Button
            variant="ghost"
            label={t('common.cancel')}
            onPress={() => {
              void cancelRecovery()
            }}
            testID="update-password-cancel"
          />
        </View>
      </DismissKeyboardView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[6],
    paddingVertical: space[6],
  },
  form: { gap: space[3] },
  pending: { alignItems: 'center', justifyContent: 'center' },
})
