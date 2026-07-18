import { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, ListRow, NavGroup, space, useTheme } from '@/core/design-system'
import { logger } from '@/core/logging/logger'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { useQueryClient } from '@tanstack/react-query'
import { toLocalDate, type ObligationKind } from '@eltizamati/domain'
import { ObligationService } from '@/services/obligation-service'
import { LoanFormFields } from '@/features/obligation-form/components/LoanFormFields'
import { MurabahaFormFields } from '@/features/obligation-form/components/MurabahaFormFields'
import { CardFormFields } from '@/features/obligation-form/components/CardFormFields'
import {
  emptyLoanFormState,
  emptyMurabahaFormState,
  emptyCardFormState,
  type LoanFormState,
  type MurabahaFormState,
  type CardFormState,
} from '@/features/obligation-form/types'
import {
  validateLoanForm,
  validateMurabahaForm,
  validateCardForm,
} from '@/features/obligation-form/validation'

const service = new ObligationService()

/** Direction-aware chevron for row navigation (icons with inherent direction flip in RTL). */
const CHEVRON_ICON: keyof typeof Ionicons.glyphMap = I18nManager.isRTL
  ? 'chevron-back-outline'
  : 'chevron-forward-outline'

type AddableKind = Extract<ObligationKind, 'conventionalLoan' | 'murabaha' | 'creditCard'>

export default function AddObligationScreen() {
  return (
    <RequireRepositories>
      <AddObligationInner />
    </RequireRepositories>
  )
}

function AddObligationInner() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const queryClient = useQueryClient()

  const [kind, setKind] = useState<AddableKind | null>(null)
  const [loanState, setLoanState] = useState<LoanFormState>(emptyLoanFormState)
  const [murabahaState, setMurabahaState] = useState<MurabahaFormState>(emptyMurabahaFormState)
  const [cardState, setCardState] = useState<CardFormState>(emptyCardFormState)
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  function reportSaveFailure(
    stage: AddableKind,
    failure: {
      readonly code: string
      readonly safeMetadata?: Record<string, string | number | boolean>
    },
  ): void {
    logger.error({
      stage: `obligationCreate:${stage}`,
      code: failure.code,
      safeMetadata: failure.safeMetadata,
    })
  }

  function reportValidationFailure(stage: AddableKind, validationKey: string): void {
    logger.debug({
      stage: `obligationCreate:${stage}`,
      code: 'validationFailed',
      safeMetadata: { validationKey },
    })
  }

  async function handleSave() {
    if (!activeUser || kind === null) return
    setError(undefined)

    if (kind === 'conventionalLoan') {
      const validationKey = validateLoanForm(loanState, true)
      if (validationKey !== undefined) {
        reportValidationFailure(kind, validationKey)
        return setError(t(validationKey))
      }
      setSaving(true)
      const result = await service.createLoan(
        activeUser,
        {
          nickname: loanState.nickname,
          institutionName: loanState.institutionName,
          openedDate: toLocalDate(loanState.openedDate),
          originalPrincipal: loanState.originalPrincipal,
          outstandingBalance:
            loanState.outstandingBalance === '' ? undefined : loanState.outstandingBalance,
          installment: loanState.installment,
          rateType: loanState.rateType,
          termMonths: Number(loanState.termMonths),
          startDate: toLocalDate(loanState.startDate),
          maturityDate: toLocalDate(loanState.maturityDate),
        },
        loanState.annualRatePercent,
        repos,
      )
      setSaving(false)
      if (!result.ok) {
        reportSaveFailure(kind, result.error)
        return setError(t('obligationForm.errors.saveFailed'))
      }
      await queryClient.invalidateQueries()
      router.replace(`/obligation/${result.value.id}`)
      return
    }

    if (kind === 'murabaha') {
      const validationKey = validateMurabahaForm(murabahaState)
      if (validationKey !== undefined) {
        reportValidationFailure(kind, validationKey)
        return setError(t(validationKey))
      }
      setSaving(true)
      const result = await service.createMurabaha(
        activeUser,
        {
          nickname: murabahaState.nickname,
          institutionName: murabahaState.institutionName,
          openedDate: toLocalDate(murabahaState.openedDate),
          totalSalePrice: murabahaState.totalSalePrice,
          assetCost: murabahaState.assetCost,
          disclosedProfit: murabahaState.disclosedProfit,
          installment: murabahaState.installment,
          termMonths: Number(murabahaState.termMonths),
          startDate: toLocalDate(murabahaState.startDate),
          profitRateDisclosedPercent:
            murabahaState.profitRateDisclosedPercent === ''
              ? undefined
              : murabahaState.profitRateDisclosedPercent,
        },
        repos,
      )
      setSaving(false)
      if (!result.ok) {
        reportSaveFailure(kind, result.error)
        return setError(t('obligationForm.errors.saveFailed'))
      }
      await queryClient.invalidateQueries()
      router.replace(`/obligation/${result.value.id}`)
      return
    }

    if (kind === 'creditCard') {
      const validationKey = validateCardForm(cardState)
      if (validationKey !== undefined) {
        reportValidationFailure(kind, validationKey)
        return setError(t(validationKey))
      }
      setSaving(true)
      const result = await service.createCard(
        activeUser,
        {
          nickname: cardState.nickname,
          institutionName: cardState.institutionName,
          openedDate: toLocalDate(cardState.openedDate),
          creditLimit: cardState.creditLimit,
          currentBalance: cardState.currentBalance,
          purchaseAprPercent:
            cardState.purchaseAprPercent === '' ? undefined : cardState.purchaseAprPercent,
          cashAdvanceAprPercent:
            cardState.cashAdvanceAprPercent === '' ? undefined : cardState.cashAdvanceAprPercent,
          dueDate: cardState.dueDate === '' ? undefined : toLocalDate(cardState.dueDate),
        },
        repos,
      )
      setSaving(false)
      if (!result.ok) {
        reportSaveFailure(kind, result.error)
        return setError(t('obligationForm.errors.saveFailed'))
      }
      await queryClient.invalidateQueries()
      router.replace(`/obligation/${result.value.id}`)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
      >
        <Stack.Screen options={{ title: t('obligationForm.addTitle') }} />

        {kind === null ? (
          <View style={styles.pickerGroup}>
            <Text variant="bodySmall" color="secondary">
              {t('obligationForm.pickKind')}
            </Text>
            <NavGroup>
              <ListRow
                onPress={() => setKind('conventionalLoan')}
                leading={<Ionicons name="business-outline" size={20} color={theme.textSecondary} />}
                trailing={<Ionicons name={CHEVRON_ICON} size={18} color={theme.textTertiary} />}
              >
                <Text variant="body">{t('obligationKind.conventionalLoan')}</Text>
              </ListRow>
              <ListRow
                onPress={() => setKind('murabaha')}
                leading={
                  <Ionicons name="storefront-outline" size={20} color={theme.textSecondary} />
                }
                trailing={<Ionicons name={CHEVRON_ICON} size={18} color={theme.textTertiary} />}
              >
                <Text variant="body">{t('obligationKind.murabaha')}</Text>
              </ListRow>
              <ListRow
                onPress={() => setKind('creditCard')}
                leading={<Ionicons name="card-outline" size={20} color={theme.textSecondary} />}
                trailing={<Ionicons name={CHEVRON_ICON} size={18} color={theme.textTertiary} />}
              >
                <Text variant="body">{t('obligationKind.creditCard')}</Text>
              </ListRow>
            </NavGroup>
          </View>
        ) : (
          <View style={styles.formGroup}>
            {kind === 'conventionalLoan' && (
              <LoanFormFields
                state={loanState}
                onChange={(patch) => setLoanState((s) => ({ ...s, ...patch }))}
                showInitialRate
              />
            )}
            {kind === 'murabaha' && (
              <MurabahaFormFields
                state={murabahaState}
                onChange={(patch) => setMurabahaState((s) => ({ ...s, ...patch }))}
              />
            )}
            {kind === 'creditCard' && (
              <CardFormFields
                state={cardState}
                onChange={(patch) => setCardState((s) => ({ ...s, ...patch }))}
              />
            )}

            {error !== undefined && (
              <Text variant="bodySmall" color="critical">
                {error}
              </Text>
            )}

            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setKind(null)}
                disabled={saving}
              />
              <Button
                label={t('obligationForm.save')}
                onPress={() => void handleSave()}
                loading={saving}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[10],
  },
  pickerGroup: {
    gap: space[3],
  },
  formGroup: {
    gap: space[4],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
  },
})
