import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, Button, TextField, space } from '@/core/design-system'
import type { RateType } from '@eltizamati/domain'
import { RATE_TYPES, type LoanFormState } from '../types'
import { DatePickerField } from './DatePickerField'
import { InstitutionPickerField } from './InstitutionPickerField'

export interface LoanFormFieldsProps {
  readonly state: LoanFormState
  readonly onChange: (patch: Partial<LoanFormState>) => void
  readonly showInitialRate: boolean
}

export function LoanFormFields({ state, onChange, showInitialRate }: LoanFormFieldsProps) {
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
        label={t('obligationForm.originalPrincipal')}
        value={state.originalPrincipal}
        onChangeText={(originalPrincipal) => onChange({ originalPrincipal })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationForm.outstandingBalanceOptional')}
        value={state.outstandingBalance}
        onChangeText={(outstandingBalance) => onChange({ outstandingBalance })}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t('obligationForm.installment')}
        value={state.installment}
        onChangeText={(installment) => onChange({ installment })}
        keyboardType="decimal-pad"
      />

      <View style={styles.rateTypeGroup}>
        <Text variant="bodySmall" color="secondary">
          {t('obligationForm.rateTypeLabel')}
        </Text>
        <View style={styles.rateTypeRow}>
          {RATE_TYPES.map((rt: RateType) => (
            <Button
              key={rt}
              label={t(`obligationForm.rateType.${rt}`)}
              variant={state.rateType === rt ? 'primary' : 'secondary'}
              onPress={() => onChange({ rateType: rt })}
            />
          ))}
        </View>
      </View>

      {showInitialRate && (
        <TextField
          label={t('obligationForm.annualRatePercent')}
          value={state.annualRatePercent}
          onChangeText={(annualRatePercent) => onChange({ annualRatePercent })}
          keyboardType="decimal-pad"
        />
      )}
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
      <DatePickerField
        label={t('obligationForm.maturityDate')}
        value={state.maturityDate}
        onChange={(maturityDate) => onChange({ maturityDate })}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: space[3],
  },
  rateTypeGroup: {
    gap: space[1],
  },
  rateTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
})
