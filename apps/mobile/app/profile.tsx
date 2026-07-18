import { useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, Text, TextField, Button, space } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUserState } from '@/features/auth/hooks/use-active-user'
import { useProfileQuery, useUpdateProfileMutation } from '@/features/auth/api/use-profile'
import { normalizeSignupProfile } from '@/features/auth/services/signup-profile'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { useAuthExitCoordinator } from '@/features/auth/hooks/use-auth-exit-coordinator'
import { useDeleteAccountMutation } from '@/features/auth/api/use-account-mutations'
import type { Id } from '@eltizamati/domain'

export default function ProfileScreen() {
  return (
    <RequireRepositories>
      <ProfileContent />
    </RequireRepositories>
  )
}

function ProfileContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const activeUser = useActiveUserState()

  if (activeUser.status === 'demo') {
    return (
      <Screen maxWidth="readable">
        <View style={styles.section}>
          <Text variant="title">{t('profile.title')}</Text>
          <Text variant="body" color="secondary">
            {t('profile.demoMessage')}
          </Text>
          <Button
            label={t('settings.demoSignInAction')}
            onPress={() => router.replace('/auth/sign-in')}
            testID="profile-sign-in"
          />
          <Button
            label={t('navigation.settings')}
            variant="secondary"
            onPress={() => router.push('/settings/')}
          />
        </View>
      </Screen>
    )
  }

  if (activeUser.status !== 'authenticated') {
    return (
      <Screen loading maxWidth="readable">
        <Text variant="body">{t('common.loading')}</Text>
      </Screen>
    )
  }

  return <PersonalProfile userId={activeUser.userId} />
}

function PersonalProfile({ userId }: { readonly userId: Id<'user'> }) {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const profileQuery = useProfileQuery(repos.userProfileRepository, userId)
  const updateProfile = useUpdateProfileMutation(repos.userProfileRepository)
  const authService = useAuthService()
  const authExitCoordinator = useAuthExitCoordinator(authService)
  const deleteAccount = useDeleteAccountMutation(authService, authExitCoordinator)
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [primaryBank, setPrimaryBank] = useState('')
  const [validationError, setValidationError] = useState(false)

  useEffect(() => {
    if (profileQuery.data === undefined) return
    setFullName(profileQuery.data.fullName ?? '')
    setPhoneNumber(profileQuery.data.phoneNumber ?? '')
    setPrimaryBank(profileQuery.data.primaryBank ?? '')
  }, [profileQuery.data])

  async function saveProfile(): Promise<void> {
    if (profileQuery.data === undefined) return
    const normalized = normalizeSignupProfile({ fullName, phoneNumber, primaryBank })
    setValidationError(normalized === undefined)
    if (normalized === undefined) return
    await updateProfile.mutateAsync({
      ...profileQuery.data,
      ...normalized,
      updatedAt: new Date().toISOString(),
    })
  }

  function confirmDelete(): void {
    Alert.alert(t('settings.deleteAccountConfirmTitle'), t('settings.deleteAccountConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirmAction'),
        style: 'destructive',
        onPress: () => deleteAccount.mutate(undefined),
      },
    ])
  }

  return (
    <Screen loading={profileQuery.isLoading} maxWidth="readable">
      <View style={styles.section}>
        <Text variant="title">{t('profile.personalDetails')}</Text>
        <TextField
          label={t('auth.fullName')}
          value={fullName}
          onChangeText={setFullName}
          testID="profile-full-name"
        />
        <TextField
          label={t('auth.phoneNumber')}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          testID="profile-phone"
        />
        <TextField
          label={t('auth.primaryBank')}
          value={primaryBank}
          onChangeText={setPrimaryBank}
          testID="profile-primary-bank"
        />
        {validationError ? (
          <Text variant="bodySmall" color="critical">
            {t('auth.profileValidation')}
          </Text>
        ) : null}
        {updateProfile.isError ? (
          <Text variant="bodySmall" color="critical">
            {t('profile.saveFailed')}
          </Text>
        ) : null}
        {updateProfile.isSuccess ? (
          <Text variant="bodySmall" color="secondary">
            {t('profile.saved')}
          </Text>
        ) : null}
        <Button
          label={t('profile.save')}
          onPress={() => void saveProfile()}
          loading={updateProfile.isPending}
          testID="profile-save"
        />
        <Button
          label={t('navigation.settings')}
          variant="secondary"
          onPress={() => router.push('/settings/')}
        />
      </View>
      <View style={styles.dangerZone}>
        <Text variant="bodySmall" color="secondary">
          {t('profile.accountManagement')}
        </Text>
        <Button
          label={t('settings.deleteAccountButton')}
          variant="destructive"
          onPress={confirmDelete}
          loading={deleteAccount.isPending}
          testID="profile-delete-account"
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  dangerZone: { gap: space[3], marginTop: space[7] },
})
