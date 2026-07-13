import { useState } from 'react'
import { Alert, View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Constants from 'expo-constants'
import { err, makeError, type AppError, type Result } from '@eltizamati/domain'
import { Screen, Text, Button, space } from '@/core/design-system'
import { changeLanguage } from '@/i18n'
import { useRepositoriesIfAvailable } from '@/features/repositories/hooks/use-repositories'
import type { DemoRepositories } from '@/services/repositories/demo'
import { ImportService } from '@/services/import-service'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import { useAuthServiceIfAvailable } from '@/features/auth/hooks/use-auth-service'
import {
  useSignOutMutation,
  useDeleteAccountMutation,
} from '@/features/auth/api/use-account-mutations'
import type { AuthService } from '@/services/auth/auth-service'

const NO_AUTH_PROVIDER_ERROR: AppError = makeError('unexpected', {
  safeMetadata: { reason: 'AuthServiceProvider not mounted' },
})

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const repos = useRepositoriesIfAvailable()
  const queryClient = useQueryClient()
  const [isResetting, setIsResetting] = useState(false)

  const authServiceIfAvailable = useAuthServiceIfAvailable()
  const authServiceResult: Result<AuthService, AppError> =
    authServiceIfAvailable ?? err(NO_AUTH_PROVIDER_ERROR)
  const isPersonalMode = repos !== null && typeof repos.reset !== 'function'

  const { data: session } = useQuery({
    queryKey: ['settingsCurrentSession'],
    queryFn: async () => {
      if (!authServiceResult.ok) return undefined
      const result = await authServiceResult.value.currentSession()
      return result.ok ? result.value : undefined
    },
    enabled: isPersonalMode,
  })

  const signOutMutation = useSignOutMutation(authServiceResult)
  const deleteAccountMutation = useDeleteAccountMutation(authServiceResult)

  function handleSignOut() {
    signOutMutation.mutate(undefined, {
      onSuccess: () => router.replace('/auth/sign-in'),
    })
  }

  function handleDeleteAccount() {
    Alert.alert(t('settings.deleteAccountConfirmTitle'), t('settings.deleteAccountConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirmAction'),
        style: 'destructive',
        onPress: () => {
          deleteAccountMutation.mutate(undefined, {
            onSuccess: () => router.replace('/auth/sign-in'),
          })
        },
      },
    ])
  }

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en'
    changeLanguage(nextLang).catch(() => {
      // changeLanguage already warns internally when it cannot auto-reload.
    })
  }

  // `reset()` only exists on the demo repository family (FR-SET-005) —
  // personal-mode Supabase repositories have no local state to wipe.
  const canResetDemo = repos !== null && typeof repos.reset === 'function'

  async function performReset() {
    if (repos === null || typeof repos.reset !== 'function') return
    setIsResetting(true)
    try {
      const seed = new DemoSeedProvider().provide()
      await new ImportService().resetDemo(seed, repos as DemoRepositories)
      // Several demo queries use staleTime: Infinity ("demo data never goes
      // stale") — that assumption only holds without a reset button, so the
      // cache must be invalidated explicitly for screens to show the
      // freshly re-seeded data instead of what they'd already cached.
      await queryClient.invalidateQueries()
    } finally {
      setIsResetting(false)
    }
  }

  function handleResetDemo() {
    Alert.alert(t('settings.resetDemoConfirmTitle'), t('settings.resetDemoConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetDemoConfirmAction'),
        style: 'destructive',
        onPress: () => {
          void performReset()
        },
      },
    ])
  }

  return (
    <Screen>
      <Text variant="title">{t('settings.title')}</Text>

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('settings.languageLabel')}
        </Text>
        <Button label={t('common.toggleLanguage')} onPress={toggleLanguage} variant="secondary" />
      </View>

      {canResetDemo ? (
        <View style={styles.section}>
          <Text variant="bodySmall" color="secondary">
            {t('settings.resetDemoLabel')}
          </Text>
          <Button
            label={t('settings.resetDemoButton')}
            onPress={handleResetDemo}
            variant="destructive"
            loading={isResetting}
            testID="settings-reset-demo"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('settings.acknowledgmentsLabel')}
        </Text>
        <Button
          label={t('settings.acknowledgmentsButton')}
          onPress={() => router.push('/settings/acknowledgments')}
          variant="secondary"
        />
      </View>

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('settings.dataStatusLabel')}
        </Text>
        <Button
          label={t('settings.dataStatusButton')}
          onPress={() => router.push('/settings/data-status')}
          variant="secondary"
        />
      </View>

      {isPersonalMode ? (
        <View style={styles.section}>
          <Text variant="bodySmall" color="secondary">
            {t('settings.accountLabel')}
          </Text>
          {session?.user.email !== undefined && (
            <Text variant="body">{t('settings.signedInAs', { email: session.user.email })}</Text>
          )}
          <Button
            label={t('settings.signOutButton')}
            onPress={handleSignOut}
            variant="secondary"
            loading={signOutMutation.isPending}
            testID="settings-sign-out"
          />
          <Button
            label={t('settings.deleteAccountButton')}
            onPress={handleDeleteAccount}
            variant="destructive"
            loading={deleteAccountMutation.isPending}
            testID="settings-delete-account"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('settings.aboutLabel')}
        </Text>
        <Text variant="body">
          {t('settings.aboutVersion', { version: Constants.expoConfig?.version ?? '—' })}
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: space[3],
    marginTop: space[5],
  },
})
