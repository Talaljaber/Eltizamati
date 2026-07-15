import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TextField, space } from '@/core/design-system'
import type { MurabahaFormState } from '../types'
import { DatePickerField } from './DatePickerField'

export interface MurabahaFormFieldsProps {
  readonly state: MurabahaFormState
  readonly onChange: (patch: Partial<MurabahaFormState>) => void
}

export function MurabahaFormFields({ state, onChange }: MurabahaFormFieldsProps) {
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
      <DatePickerField
        label={t('obligationForm.openedDate')}
        value={state.openedDate}
        onChange={(openedDate) => onChange({ openedDate })}
      />
      <TextField
        label={t('obligationDetail.totalSalePrice')}
        value={state.totalSalePrice}
        onChangeText={(totalSalePrice) => onChange({ totalSalePrice })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationDetail.assetCost')}
        value={state.assetCost}
        onChangeText={(assetCost) => onChange({ assetCost })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationDetail.disclosedProfit')}
        value={state.disclosedProfit}
        onChangeText={(disclosedProfit) => onChange({ disclosedProfit })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationDetail.installment')}
        value={state.installment}
        onChangeText={(installment) => onChange({ installment })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationForm.termMonths')}
        value={state.termMonths}
        onChangeText={(termMonths) => onChange({ termMonths })}
        keyboardType="numeric"
      />
      <DatePickerField
        label={t('obligationForm.startDate')}
        value={state.startDate}
        onChange={(startDate) => onChange({ startDate })}
      />
      <TextField
        label={t('obligationForm.profitRateDisclosedOptional')}
        value={state.profitRateDisclosedPercent}
        onChangeText={(profitRateDisclosedPercent) => onChange({ profitRateDisclosedPercent })}
        keyboardType="decimal-pad"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: space[3],
  },
})
