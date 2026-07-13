import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TextField, space } from '@/core/design-system'
import type { CardFormState } from '../types'

export interface CardFormFieldsProps {
  readonly state: CardFormState
  readonly onChange: (patch: Partial<CardFormState>) => void
}

export function CardFormFields({ state, onChange }: CardFormFieldsProps) {
  const { t } = useTranslation()

  return (
    <View style={styles.group}>
      <TextField
        label={t('obligationForm.nickname')}
        value={state.nickname}
        onChangeText={(nickname) => onChange({ nickname })}
      />
      <TextField
        label={t('obligationForm.institutionName')}
        value={state.institutionName}
        onChangeText={(institutionName) => onChange({ institutionName })}
      />
      <TextField
        label={t('obligationForm.openedDate')}
        value={state.openedDate}
        onChangeText={(openedDate) => onChange({ openedDate })}
        placeholder="YYYY-MM-DD"
      />
      <TextField
        label={t('obligationDetail.creditLimit')}
        value={state.creditLimit}
        onChangeText={(creditLimit) => onChange({ creditLimit })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationDetail.currentBalance')}
        value={state.currentBalance}
        onChangeText={(currentBalance) => onChange({ currentBalance })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationForm.purchaseAprOptional')}
        value={state.purchaseAprPercent}
        onChangeText={(purchaseAprPercent) => onChange({ purchaseAprPercent })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationForm.cashAdvanceAprOptional')}
        value={state.cashAdvanceAprPercent}
        onChangeText={(cashAdvanceAprPercent) => onChange({ cashAdvanceAprPercent })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationForm.dueDateOptional')}
        value={state.dueDate}
        onChangeText={(dueDate) => onChange({ dueDate })}
        placeholder="YYYY-MM-DD"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: space[3],
  },
})
