import { useEffect, useState } from 'react'
import { Alert, View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Constants from 'expo-constants'
import { DEMO_IDS } from '@eltizamati/demo-data'
import {
  brandId,
  err,
  makeError,
  type AppError,
  type Id,
  type Result,
  type UserProfile,
} from '@eltizamati/domain'
import { Screen, Text, Button, TextField, SectionHeader, space } from '@/core/design-system'
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
import { authKeys } from '@/features/auth/api/keys'
import { isValidDecimal, isValidPositiveInt } from '@/features/obligation-form/validation'
import { cancelLocalReminder, scheduleLocalReminder } from '@/services/local-notification-service'
import { useAuthExitCoordinator } from '@/features/auth/hooks/use-auth-exit-coordinator'

const MAX_REMINDER_DAY = 28

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
      if (!authServiceResult.ok) return null
      const result = await authServiceResult.value.currentSession()
      return result.ok ? (result.value ?? null) : null
    },
    enabled: isPersonalMode,
  })

  const authExitCoordinator = useAuthExitCoordinator(authServiceResult)
  const signOutMutation = useSignOutMutation(authServiceResult, authExitCoordinator)
  const deleteAccountMutation = useDeleteAccountMutation(authServiceResult, authExitCoordinator)

  function handleSignOut() {
    signOutMutation.mutate(undefined)
  }

  function handleDeleteAccount() {
    Alert.alert(t('settings.deleteAccountConfirmTitle'), t('settings.deleteAccountConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirmAction'),
        style: 'destructive',
        onPress: () => {
          deleteAccountMutation.mutate(undefined)
        },
      },
    ])
  }

  // Demo mode's user id is the fixed demo sentinel; personal mode's comes
  // from the current session fetched above — neither needs useActiveUser(),
  // which requires AuthServiceProvider unconditionally and would break
  // screens/tests that render Settings without it mounted.
  const activeUserId: Id<'user'> | undefined = isPersonalMode
    ? session?.user.id !== undefined
      ? brandId<'user'>(session.user.id)
      : undefined
    : repos !== null && typeof repos.reset === 'function'
      ? DEMO_IDS.userId
      : undefined

  const { data: profile } = useQuery({
    queryKey: authKeys.profile(activeUserId ?? ''),
    queryFn: async () => {
      if (!repos || !activeUserId) return undefined
      const result = await repos.userProfileRepository.get(activeUserId)
      return result.ok ? result.value : undefined
    },
    enabled: !!repos && !!activeUserId,
  })

  const [reminderDay, setReminderDay] = useState('')
  const [thresholdAmount, setThresholdAmount] = useState('')
  const [remindersSaving, setRemindersSaving] = useState(false)
  const [remindersError, setRemindersError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!profile) return
    setReminderDay(
      profile.reminderDayOfMonth !== undefined ? String(profile.reminderDayOfMonth) : '',
    )
    setThresholdAmount(profile.userThresholdAmount ?? '')
  }, [profile])

  async function handleSaveReminders() {
    if (!repos || !activeUserId || !profile) return
    setRemindersError(undefined)

    if (
      reminderDay !== '' &&
      (!isValidPositiveInt(reminderDay) || Number(reminderDay) > MAX_REMINDER_DAY)
    ) {
      setRemindersError(t('settings.reminders.errorDay'))
      return
    }
    if (thresholdAmount !== '' && !isValidDecimal(thresholdAmount)) {
      setRemindersError(t('settings.reminders.errorAmount'))
      return
    }

    setRemindersSaving(true)
    const updated: UserProfile = {
      ...profile,
      reminderDayOfMonth: reminderDay === '' ? undefined : Number(reminderDay),
      userThresholdAmount: thresholdAmount === '' ? undefined : thresholdAmount,
      updatedAt: new Date().toISOString(),
    }
    const result = await repos.userProfileRepository.save(updated)
    setRemindersSaving(false)
    if (result.ok) {
      if (updated.reminderDayOfMonth === undefined) {
        await cancelLocalReminder()
      } else {
        const scheduleResult = await scheduleLocalReminder(updated.reminderDayOfMonth, {
          title: t('settings.reminders.notificationTitle'),
          body: t('settings.reminders.notificationBody'),
        })
        if (scheduleResult === 'permissionDenied') {
          setRemindersError(t('settings.reminders.permissionDenied'))
        }
      }
      await queryClient.invalidateQueries({ queryKey: authKeys.profile(activeUserId) })
    } else {
      setRemindersError(t('settings.reminders.saveFailed'))
    }
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

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('mockConnect.settingsLabel')}
        </Text>
        <Button
          label={t('mockConnect.settingsAction')}
          onPress={() => router.push('/connect-mock/consent')}
          variant="secondary"
        />
      </View>

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('legalDoc.title')}
        </Text>
        <Button
          label={t('legalDoc.title')}
          onPress={() => router.push('/legal-doc')}
          variant="secondary"
        />
      </View>

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

      {profile !== undefined && (
        <View style={styles.section}>
          <Text variant="bodySmall" color="secondary">
            {t('settings.reminders.label')}
          </Text>
          <TextField
            label={t('settings.reminders.dayLabel')}
            value={reminderDay}
            onChangeText={setReminderDay}
            keyboardType="numeric"
            placeholder="1-28"
          />
          <TextField
            label={t('settings.reminders.thresholdLabel')}
            value={thresholdAmount}
            onChangeText={setThresholdAmount}
            keyboardType="decimal-pad"
          />
          {remindersError !== undefined && (
            <Text variant="bodySmall" color="critical">
              {remindersError}
            </Text>
          )}
          <Button
            label={t('settings.reminders.save')}
            onPress={() => void handleSaveReminders()}
            variant="secondary"
            loading={remindersSaving}
            testID="settings-save-reminders"
          />
        </View>
      )}

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
        </View>
      ) : repos !== null ? (
        <View style={styles.section}>
          <Text variant="bodySmall" color="secondary">
            {t('settings.accountLabel')}
          </Text>
          <Text variant="body" color="secondary">
            {t('settings.demoAccountPrompt')}
          </Text>
          <Button
            label={t('settings.demoSignInAction')}
            onPress={() => router.push('/auth/sign-in')}
            variant="secondary"
            testID="settings-demo-sign-in"
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

      {(canResetDemo || isPersonalMode) && (
        <View style={styles.dangerZone}>
          <SectionHeader title={t('obligationDetail.manage', 'Manage')} />
          {canResetDemo && (
            <Button
              label={t('settings.resetDemoButton')}
              onPress={handleResetDemo}
              variant="destructive"
              loading={isResetting}
              testID="settings-reset-demo"
            />
          )}
          {isPersonalMode && (
            <Button
              label={t('settings.deleteAccountButton')}
              onPress={handleDeleteAccount}
              variant="destructive"
              loading={deleteAccountMutation.isPending}
              testID="settings-delete-account"
            />
          )}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: space[3],
    marginTop: space[5],
  },
  dangerZone: {
    gap: space[3],
    marginTop: space[7],
  },
})
