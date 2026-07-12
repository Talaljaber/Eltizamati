/**
 * SCR-AUTH-RESET — request a password reset. States: L · ER · OF ·
 * sent-confirmation. Never discloses whether the email is actually
 * registered (sent-confirmation copy is identical either way).
 */
import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, EmptyState, ErrorState, space, useTheme } from '@/core/design-system'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { useResetPasswordMutation } from '@/features/auth/api/use-auth-mutations'

export default function ResetScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const authServiceResult = useAuthService()
  const resetPassword = useResetPasswordMutation(authServiceResult)

  const error = resetPassword.error ?? undefined
  const isOffline = error !== undefined && error.code === 'connectivity'

  if (resetPassword.isSuccess) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <EmptyState
          title={t('auth.resetSentTitle')}
          subtitle={t('auth.resetSentBody', { email })}
          ctaLabel={t('auth.resetBackToSignIn')}
          onCta={() => router.replace('/auth/sign-in')}
          testID="reset-sent"
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {isOffline ? (
        <ErrorState
          state={{ kind: 'offline' }}
          onRetry={() => resetPassword.mutate(email)}
          testID="reset-offline"
        />
      ) : (
        <View style={styles.content}>
          <Text variant="title" align="center">
            {t('auth.resetTitle')}
          </Text>
          <Text variant="body" color="secondary" align="center">
            {t('auth.resetBody')}
          </Text>

          <View style={styles.form}>
            <AuthTextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!resetPassword.isPending}
              testID="reset-email"
            />

            {error !== undefined ? (
              <Text variant="bodySmall" color="critical" testID="reset-error">
                {t(error.userMessageKey)}
              </Text>
            ) : null}

            <Button
              variant="primary"
              label={t('auth.resetButton')}
              loading={resetPassword.isPending}
              disabled={email === ''}
              onPress={() => resetPassword.mutate(email)}
              testID="reset-submit"
            />
          </View>

          <Text
            variant="bodySmall"
            color="brand"
            align="center"
            onPress={() => router.replace('/auth/sign-in')}
            testID="reset-back-to-sign-in"
          >
            {t('auth.resetBackToSignIn')}
          </Text>
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
})
