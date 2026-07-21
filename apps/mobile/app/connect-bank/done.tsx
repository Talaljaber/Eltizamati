/**
 * SCR-CONNBANK-DONE — "Do you have any other obligations?" loop
 * (connect-plan.md, matching the user's original spec). Yes restarts the
 * flow at bank selection; No/Skip marks the step complete (server-side,
 * user-scoped — connect-plan.md Phase D) and proceeds into the app.
 */
import { useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { AppError } from '@eltizamati/domain'
import { Button, Screen, Text } from '@/core/design-system'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { resetConnectBankFlow } from '@/features/connect-bank/connect-bank-flow-store'
import { useMarkBankConnectCompleteMutation } from '@/features/connect-bank/api/use-connect-bank'
import { MockDisclosure } from '@/features/connect-bank/components/MockDisclosure'
import { errorMessageKey } from '@/features/connect-bank/error-message-key'

export default function ConnectBankDoneScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const userId = useActiveUser()
  const markComplete = useMarkBankConnectCompleteMutation()
  const [finishError, setFinishError] = useState<AppError | undefined>(undefined)

  function handleAddAnother(): void {
    resetConnectBankFlow()
    router.replace('/connect-bank')
  }

  async function handleFinish(): Promise<void> {
    if (!userId) return
    setFinishError(undefined)
    try {
      await markComplete.mutateAsync({ userId, repos })
      resetConnectBankFlow()
      router.replace('/(tabs)/')
    } catch (cause) {
      setFinishError(cause as AppError)
    }
  }

  return (
    <Screen maxWidth="readable" gap={4}>
      {/* No back button here on purpose: "Yes"/"No" below are the only two
          valid ways forward, and the records on the select screen behind
          this one are now filtered out as already-imported anyway. */}
      <Stack.Screen options={{ title: t('connectBank.doneTitle'), headerBackVisible: false }} />
      <MockDisclosure />
      <Text variant="title">{t('connectBank.anyOtherObligationsTitle')}</Text>
      <Text variant="body" color="secondary">
        {t('connectBank.anyOtherObligationsBody')}
      </Text>
      <Button
        variant="primary"
        label={t('common.yes')}
        onPress={handleAddAnother}
        testID="connect-bank-add-another"
      />
      <Button
        variant="secondary"
        label={t('common.no')}
        onPress={() => void handleFinish()}
        loading={markComplete.isPending}
        testID="connect-bank-finish"
      />
      {finishError !== undefined ? (
        <Text variant="bodySmall" color="critical" testID="connect-bank-finish-error">
          {t(errorMessageKey(finishError))}
        </Text>
      ) : null}
    </Screen>
  )
}
