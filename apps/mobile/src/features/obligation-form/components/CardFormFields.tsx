import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TextField, space } from '@/core/design-system'
import type { CardFormState } from '../types'
import { DatePickerField } from './DatePickerField'
import { InstitutionPickerField } from './InstitutionPickerField'

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
      <InstitutionPickerField
        value={state.institutionName}
        onChange={(institutionName) => onChange({ institutionName })}
      />
      <DatePickerField
        label={t('obligationForm.openedDate')}
        value={state.openedDate}
        onChange={(openedDate) => onChange({ openedDate })}
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
      <DatePickerField
        label={t('obligationForm.dueDateOptional')}
        value={state.dueDate}
        onChange={(dueDate) => onChange({ dueDate })}
        optional
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: space[3],
  },
})
