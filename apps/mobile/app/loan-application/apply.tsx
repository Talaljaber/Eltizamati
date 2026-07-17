/**
 * Apply-for-a-loan form. Submits a `pending` LoanApplication via the active
 * repository (demo in-memory or Supabase). Institution is picked from the
 * curated Jordan bank list (never free-typed), reusing the same
 * PickerSheetField the sign-up screen uses. Approval/rejection happens later
 * on the admin dashboard — this screen only creates the request.
 */
import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter, Stack } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Text, Button, Screen, TextField, space, radius, useTheme } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { PickerSheetField } from '@/features/auth/components/PickerSheetField'
import { JORDAN_BANKS, type JordanBank } from '@/features/auth/data/jordan-banks'
import type { LoanPurpose } from '@eltizamati/domain'

const PURPOSES: readonly LoanPurpose[] = ['personal', 'auto', 'housing', 'other']

export default function ApplyForLoanScreen() {
  return (
    <RequireRepositories>
      <ApplyForLoanInner />
    </RequireRepositories>
  )
}

function ApplyForLoanInner() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const queryClient = useQueryClient()

  const [bankId, setBankId] = useState<string | undefined>(undefined)
  const [purpose, setPurpose] = useState<LoanPurpose>('personal')
  const [amount, setAmount] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const selectedBank = JORDAN_BANKS.find((b) => b.id === bankId)

  async function submit(): Promise<void> {
    if (!activeUser) return
    const amountNumber = Number(amount)
    const termNumber = Number(termMonths)
    const valid =
      selectedBank !== undefined &&
      Number.isFinite(amountNumber) &&
      amountNumber > 0 &&
      Number.isInteger(termNumber) &&
      termNumber > 0
    if (!valid) {
      setError(t('loanApplication.validationError'))
      return
    }
    setError(undefined)
    setSubmitting(true)
    const result = await repos.loanApplicationRepository.submit(activeUser, {
      institutionName: selectedBank.name,
      purpose,
      requestedAmount: amount.trim(),
      requestedTermMonths: termNumber,
      ...(note.trim().length > 0 ? { applicantNote: note.trim() } : {}),
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(t('loanApplication.submitError'))
      return
    }
    await queryClient.invalidateQueries()
    router.replace('/(tabs)/loans')
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('loanApplication.applyTitle') }} />
      <View style={styles.intro}>
        <Text variant="bodySmall" color="secondary">
          {t('loanApplication.applyIntro')}
        </Text>
      </View>
      <View style={styles.form}>
        <PickerSheetField<JordanBank>
          label={t('loanApplication.bank')}
          items={JORDAN_BANKS}
          getId={(b) => b.id}
          getLabel={(b) => b.name}
          getSearchText={(b) => `${b.name} ${b.nameAr}`}
          selectedId={bankId}
          onSelect={(b) => setBankId(b.id)}
          placeholder={t('loanApplication.selectBank')}
          searchPlaceholder={t('loanApplication.searchBank')}
          testID="loan-apply-bank"
        />

        <View style={styles.group}>
          <Text variant="bodySmall" color="secondary">
            {t('loanApplication.purpose')}
          </Text>
          <View style={styles.purposeRow}>
            {PURPOSES.map((option) => {
              const selected = option === purpose
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPurpose(option)}
                  testID={`loan-apply-purpose-${option}`}
                  style={[
                    styles.purposeChip,
                    {
                      backgroundColor: selected ? theme.brand : theme.bgElevated,
                      borderColor: selected ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Text variant="bodySmall" color={selected ? 'onBrand' : 'secondary'}>
                    {t(`loanApplication.purpose${capitalize(option)}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <TextField
          label={t('loanApplication.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          testID="loan-apply-amount"
        />
        <TextField
          label={t('loanApplication.termMonths')}
          value={termMonths}
          onChangeText={setTermMonths}
          keyboardType="numeric"
          testID="loan-apply-term"
        />
        <TextField
          label={t('loanApplication.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('loanApplication.notePlaceholder')}
          testID="loan-apply-note"
        />

        {error !== undefined ? (
          <Text variant="bodySmall" color="critical" testID="loan-apply-error">
            {error}
          </Text>
        ) : null}

        <Button
          variant="primary"
          label={submitting ? t('loanApplication.submitting') : t('loanApplication.submit')}
          loading={submitting}
          disabled={submitting}
          onPress={() => void submit()}
          testID="loan-apply-submit"
        />
      </View>
    </Screen>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const styles = StyleSheet.create({
  intro: { marginBottom: space[4] },
  form: { gap: space[4] },
  group: { gap: space[1] },
  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  purposeChip: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.full,
    borderWidth: 1,
  },
})
