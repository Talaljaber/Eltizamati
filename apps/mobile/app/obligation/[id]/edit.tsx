import { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Text, Button, space } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import {
  toLocalDate,
  type Id,
  type ConventionalLoan,
  type MurabahaFinancing,
  type CreditCard,
} from '@eltizamati/domain'
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

export default function EditObligationScreen() {
  return (
    <RequireRepositories>
      <EditObligationInner />
    </RequireRepositories>
  )
}

function loanToFormState(o: ConventionalLoan): LoanFormState {
  return {
    nickname: o.nickname,
    institutionName: o.institution.name,
    openedDate: o.openedDate,
    originalPrincipal: o.loanDetails.originalPrincipal.value.toStorageString(),
    outstandingBalance: o.loanDetails.outstandingBalance?.value.toStorageString() ?? '',
    installment: o.loanDetails.installment.value.toStorageString(),
    rateType: o.loanDetails.rateType,
    annualRatePercent: '',
    termMonths: String(o.loanDetails.termMonths.value),
    startDate: o.loanDetails.startDate,
    maturityDate: o.loanDetails.maturityDate,
  }
}

function murabahaToFormState(o: MurabahaFinancing): MurabahaFormState {
  return {
    nickname: o.nickname,
    institutionName: o.institution.name,
    openedDate: o.openedDate,
    totalSalePrice: o.murabahaDetails.totalSalePrice.value.toStorageString(),
    assetCost: o.murabahaDetails.assetCost.value.toStorageString(),
    disclosedProfit: o.murabahaDetails.disclosedProfit.value.toStorageString(),
    installment: o.murabahaDetails.installment.value.toStorageString(),
    termMonths: String(o.murabahaDetails.termMonths.value),
    startDate: o.murabahaDetails.startDate,
    profitRateDisclosedPercent: o.murabahaDetails.profitRateDisclosed?.toStorageString() ?? '',
  }
}

function cardToFormState(o: CreditCard): CardFormState {
  return {
    nickname: o.nickname,
    institutionName: o.institution.name,
    openedDate: o.openedDate,
    creditLimit: o.cardDetails.creditLimit.value.toStorageString(),
    currentBalance: o.cardDetails.currentBalance.value.toStorageString(),
    purchaseAprPercent: o.cardDetails.purchaseApr?.value.toStorageString() ?? '',
    cashAdvanceAprPercent: o.cardDetails.cashAdvanceApr?.value.toStorageString() ?? '',
    dueDate: o.cardDetails.dueDate ?? '',
  }
}

function EditObligationInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const obligationId = id as Id<'obligation'>

  const { data: obligation, isLoading } = useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const [loanState, setLoanState] = useState<LoanFormState>(emptyLoanFormState)
  const [murabahaState, setMurabahaState] = useState<MurabahaFormState>(emptyMurabahaFormState)
  const [cardState, setCardState] = useState<CardFormState>(emptyCardFormState)
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!obligation) return
    if (obligation.kind === 'conventionalLoan') setLoanState(loanToFormState(obligation))
    if (obligation.kind === 'murabaha') setMurabahaState(murabahaToFormState(obligation))
    if (obligation.kind === 'creditCard') setCardState(cardToFormState(obligation))
  }, [obligation])

  async function handleSave() {
    if (!obligation) return
    setError(undefined)

    if (obligation.kind === 'conventionalLoan') {
      const validationKey = validateLoanForm(loanState, false)
      if (validationKey !== undefined) return setError(t(validationKey))
      setSaving(true)
      const result = await service.updateLoan(
        obligation,
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
        repos,
      )
      setSaving(false)
      if (!result.ok) return setError(t('obligationForm.errors.saveFailed'))
      await queryClient.invalidateQueries()
      router.back()
      return
    }

    if (obligation.kind === 'murabaha') {
      const validationKey = validateMurabahaForm(murabahaState)
      if (validationKey !== undefined) return setError(t(validationKey))
      setSaving(true)
      const result = await service.updateMurabaha(
        obligation,
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
      if (!result.ok) return setError(t('obligationForm.errors.saveFailed'))
      await queryClient.invalidateQueries()
      router.back()
      return
    }

    if (obligation.kind === 'creditCard') {
      const validationKey = validateCardForm(cardState)
      if (validationKey !== undefined) return setError(t(validationKey))
      setSaving(true)
      const result = await service.updateCard(
        obligation,
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
      if (!result.ok) return setError(t('obligationForm.errors.saveFailed'))
      await queryClient.invalidateQueries()
      router.back()
    }
  }

  if (isLoading || !obligation) {
    return (
      <View style={styles.loading}>
        <Text variant="body">{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('obligationForm.editTitle') }} />

      {obligation.kind === 'conventionalLoan' && (
        <LoanFormFields
          state={loanState}
          onChange={(patch) => setLoanState((s) => ({ ...s, ...patch }))}
          showInitialRate={false}
        />
      )}
      {obligation.kind === 'murabaha' && (
        <MurabahaFormFields
          state={murabahaState}
          onChange={(patch) => setMurabahaState((s) => ({ ...s, ...patch }))}
        />
      )}
      {obligation.kind === 'creditCard' && (
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
          onPress={() => router.back()}
          disabled={saving}
        />
        <Button
          label={t('obligationForm.save')}
          onPress={() => void handleSave()}
          loading={saving}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[8],
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
  },
})
