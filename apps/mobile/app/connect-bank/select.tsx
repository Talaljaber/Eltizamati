/**
 * SCR-CONNBANK-SELECT — tick which pulled obligations to import
 * (connect-plan.md Phase E). Import is idempotent + retryable (Phase C): a
 * partial failure never silently reports success, and pressing "Import
 * selected" again after a partial failure safely no-ops the records that
 * already landed and only retries the ones that didn't.
 */
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Money, type AppError } from '@eltizamati/domain'
import type { RawProviderRecord } from '@eltizamati/demo-data'
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Screen,
  Text,
  space,
} from '@/core/design-system'
import { toErrorUiState } from '@/core/errors/error-ui-state'
import { formatMoneyOfficial } from '@/core/formatting/format-money'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { JORDAN_BANKS } from '@/features/auth/data/jordan-banks'
import {
  useConnectBankFlow,
  setRetrievedRecords,
  toggleSelected,
} from '@/features/connect-bank/connect-bank-flow-store'
import {
  useRetrieveBankRecordsMutation,
  useImportSelectedMutation,
  useMarkBankConnectCompleteMutation,
} from '@/features/connect-bank/api/use-connect-bank'
import { MockDisclosure } from '@/features/connect-bank/components/MockDisclosure'
import { errorMessageKey } from '@/features/connect-bank/error-message-key'
import type { ProviderImportSummary } from '@/services/import-service'

function recordLabel(record: { productType: string }, t: (key: string) => string): string {
  const key: Record<string, string> = {
    creditCard: 'connectBank.recordCreditCard',
    conventionalLoan: 'connectBank.recordConventionalLoan',
    murabaha: 'connectBank.recordMurabaha',
  }
  return t(key[record.productType] ?? 'connectBank.recordConventionalLoan')
}

// Two records of the same kind from the same bank (e.g. a mortgage and an
// auto loan) would otherwise both render as the bare label above and look
// like the same row duplicated — this line is what actually tells them
// apart, using each record's own figures rather than a generic kind name.
function recordSublabel(
  record: RawProviderRecord,
  t: (key: string, opts: Record<string, string>) => string,
): string {
  if (record.productType === 'creditCard') {
    return t('connectBank.recordSublabelBalance', {
      amount: formatMoneyOfficial(Money.of(record.currentBalance, record.currency), record.currency),
    })
  }
  return t('connectBank.recordSublabelInstallment', {
    amount: formatMoneyOfficial(Money.of(record.installment, record.currency), record.currency),
  })
}

export default function ConnectBankSelectScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const userId = useActiveUser()
  const flow = useConnectBankFlow()
  const retrieve = useRetrieveBankRecordsMutation()
  const importSelected = useImportSelectedMutation()
  const markComplete = useMarkBankConnectCompleteMutation()
  const [lastSummary, setLastSummary] = useState<ProviderImportSummary | null>(null)
  const [importError, setImportError] = useState<AppError | undefined>(undefined)
  const [finishError, setFinishError] = useState<AppError | undefined>(undefined)
  const [retrieveAttempt, setRetrieveAttempt] = useState(0)

  const bank = JORDAN_BANKS.find((candidate) => candidate.id === flow.bankId)

  useEffect(() => {
    if (flow.bankId === undefined || !flow.signedIn || !userId) {
      router.replace('/connect-bank')
      return
    }
    if (flow.records.length > 0) return
    retrieve.mutate(
      { bankId: flow.bankId, userId, repos },
      { onSuccess: ({ records }) => setRetrievedRecords(records) },
    )
    // Retrieval only re-runs when the selected bank or retryAttempt changes —
    // flow.records is intentionally excluded so setting it above doesn't
    // retrigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.bankId, flow.signedIn, retrieveAttempt, userId])

  async function handleImport(): Promise<void> {
    if (!userId || flow.bankId === undefined) return
    setImportError(undefined)
    const selected = flow.records.filter((record) => flow.selectedExternalIds.has(record.externalId))
    try {
      const summary = await importSelected.mutateAsync({
        bankId: flow.bankId,
        userId,
        records: selected,
        repos,
      })
      setLastSummary(summary)
      if (summary.failed.length === 0) router.push('/connect-bank/done')
    } catch (cause) {
      setImportError(cause as AppError)
    }
  }

  function handleContinueAnyway(): void {
    router.push('/connect-bank/done')
  }

  // Nothing to import at this bank: complete the onboarding step and enter the app (where the
  // dashboard shows its own "no obligations yet" state) rather than bouncing the user back to
  // the bank picker. Marking complete is what actually breaks the loop — an incomplete step is
  // re-routed to /connect-bank on the next entry (see connect-plan.md Phase D / StartupCoordinator).
  async function handleFinishWithoutImport(): Promise<void> {
    if (!userId) return
    setFinishError(undefined)
    try {
      await markComplete.mutateAsync({ userId, repos })
      // Intentionally NOT resetConnectBankFlow() here: clearing flow.bankId would retrigger this
      // screen's guard effect (below) and bounce to /connect-bank — the very loop we're fixing.
      // The flow is fully reset on the next entry anyway (selectBank() resets it), and records is
      // empty in this branch, so nothing meaningful lingers.
      router.replace('/(tabs)/')
    } catch (cause) {
      setFinishError(cause as AppError)
    }
  }

  if (bank === undefined) return null
  const bankName = i18n.language.startsWith('ar') ? bank.nameAr : bank.name

  if (retrieve.isError) {
    return (
      <Screen maxWidth="readable">
        <Stack.Screen options={{ title: bankName }} />
        <ErrorState
          state={toErrorUiState(retrieve.error)}
          onRetry={() => setRetrieveAttempt((value) => value + 1)}
          testID="connect-bank-retrieve-error"
        />
      </Screen>
    )
  }

  if (!retrieve.isPending && flow.records.length === 0 && retrieve.isSuccess) {
    const alreadyImported = retrieve.data?.allAlreadyImported ?? false
    return (
      <Screen maxWidth="readable" gap={4}>
        <Stack.Screen options={{ title: bankName }} />
        <MockDisclosure />
        <EmptyState
          title={t(alreadyImported ? 'connectBank.alreadyImportedTitle' : 'connectBank.emptyTitle')}
          subtitle={t(
            alreadyImported ? 'connectBank.alreadyImportedSubtitle' : 'connectBank.emptySubtitle',
            { bank: bankName },
          )}
          // Primary path forward: finish onboarding and enter the app. "Choose a different bank"
          // stays available below as a secondary option for users who banked elsewhere too.
          ctaLabel={t('common.continue')}
          onCta={() => void handleFinishWithoutImport()}
          testID={alreadyImported ? 'connect-bank-already-imported' : 'connect-bank-empty'}
        />
        <Button
          variant="ghost"
          label={t('connectBank.pickAnotherBank')}
          onPress={() => router.replace('/connect-bank')}
          disabled={markComplete.isPending}
          testID="connect-bank-empty-pick-another"
        />
        {finishError !== undefined ? (
          <Text variant="bodySmall" color="critical" testID="connect-bank-finish-error">
            {t(errorMessageKey(finishError))}
          </Text>
        ) : null}
      </Screen>
    )
  }

  return (
    <Screen maxWidth="readable" gap={4} loading={retrieve.isPending}>
      <Stack.Screen options={{ title: bankName }} />
      <MockDisclosure />
      <Text variant="title">{t('connectBank.selectTitle')}</Text>
      <View style={{ gap: space[3] }}>
        {flow.records.map((record) => (
          <Checkbox
            key={record.externalId}
            checked={flow.selectedExternalIds.has(record.externalId)}
            onToggle={() => toggleSelected(record.externalId)}
            label={recordLabel(record, t)}
            sublabel={recordSublabel(record, t)}
            testID={`connect-bank-select-${record.externalId}`}
          />
        ))}
      </View>
      {lastSummary !== null && lastSummary.failed.length > 0 ? (
        <View style={{ gap: space[2] }}>
          <Text variant="bodySmall" color="critical">
            {t('connectBank.partialImportError', { count: lastSummary.failed.length })}
          </Text>
          <Button
            variant="ghost"
            label={t('connectBank.continueAnyway')}
            onPress={handleContinueAnyway}
            testID="connect-bank-continue-anyway"
          />
        </View>
      ) : null}
      {importError !== undefined ? (
        <Text variant="bodySmall" color="critical" testID="connect-bank-import-error">
          {t(errorMessageKey(importError))}
        </Text>
      ) : null}
      <Button
        variant="primary"
        label={t('connectBank.importSelected')}
        onPress={() => void handleImport()}
        loading={importSelected.isPending}
        disabled={flow.selectedExternalIds.size === 0 || importSelected.isPending}
        testID="connect-bank-import-selected"
      />
    </Screen>
  )
}
