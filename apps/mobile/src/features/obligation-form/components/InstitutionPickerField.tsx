import { useTranslation } from 'react-i18next'
import { PickerSheetField } from '@/core/design-system'
import { JORDAN_BANKS, type JordanBank } from '@/features/auth/data/jordan-banks'

export interface InstitutionPickerFieldProps {
  readonly value: string
  readonly onChange: (institutionName: string) => void
  readonly testID?: string
}

/**
 * Institution is picked from the curated Jordan bank list, never free-typed
 * — same rule and same list as sign-up's "primary bank" and the loan
 * application's bank picker (`app/loan-application/apply.tsx`).
 */
export function InstitutionPickerField({ value, onChange, testID }: InstitutionPickerFieldProps) {
  const { t } = useTranslation()
  const selectedId = JORDAN_BANKS.find((bank) => bank.name === value)?.id

  return (
    <PickerSheetField<JordanBank>
      label={t('obligationForm.institutionName')}
      items={JORDAN_BANKS}
      getId={(bank) => bank.id}
      getLabel={(bank) => bank.name}
      getSearchText={(bank) => `${bank.name} ${bank.nameAr}`}
      selectedId={selectedId}
      onSelect={(bank) => onChange(bank.name)}
      placeholder={t('obligationForm.selectInstitution')}
      searchPlaceholder={t('obligationForm.searchInstitution')}
      testID={testID}
    />
  )
}
