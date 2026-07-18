import { useState } from 'react'
import { Alert, View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Text,
  Button,
  TextField,
  SkeletonCard,
  space,
  layout,
  useResponsiveLayout,
} from '@/core/design-system'
import { DatePickerField } from '@/features/obligation-form/components/DatePickerField'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { toLocalDate, type Id } from '@eltizamati/domain'
import { ObligationService } from '@/services/obligation-service'
import { isValidDecimal, isValidLocalDate } from '@/features/obligation-form/validation'

const service = new ObligationService()

export default function LogPaymentScreen() {
  return (
    <RequireRepositories>
      <LogPaymentInner />
    </RequireRepositories>
  )
}

function LogPaymentInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const obligationId = id as Id<'obligation'>
  const { isWideWeb } = useResponsiveLayout()

  const { data: obligation, isLoading } = useQuery({
    queryKey: ['obligation', activeUser ?? '', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  async function persistPayment(allowDuplicate: boolean) {
    if (!obligation || !activeUser) return
    const result = await service.logPayment(
      activeUser,
      obligation,
      toLocalDate(date),
      amount,
      repos,
      allowDuplicate,
    )
    if (!result.ok && result.error.safeMetadata?.['reason'] === 'duplicatePayment') {
      setSaving(false)
      Alert.alert(
        t('obligationForm.duplicatePaymentTitle'),
        t('obligationForm.duplicatePaymentBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('obligationForm.saveAnyway'),
            onPress: () => {
              setSaving(true)
              void persistPayment(true)
            },
          },
        ],
      )
      return
    }
    setSaving(false)
    if (!result.ok) return setError(t('obligationForm.errors.saveFailed'))
    await queryClient.invalidateQueries()
    router.back()
  }

  async function handleSave() {
    if (!obligation || !activeUser) return
    if (!isValidLocalDate(date)) return setError(t('obligationForm.errors.date'))
    if (!isValidDecimal(amount)) return setError(t('obligationForm.errors.amount'))
    setError(undefined)
    setSaving(true)
    await persistPayment(false)
  }

  if (isLoading || !obligation) {
    return (
      <View style={styles.loading}>
        <SkeletonCard />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isWideWeb && styles.scrollWide]}>
      <Stack.Screen options={{ title: t('obligationForm.logPaymentTitle') }} />
      <DatePickerField label={t('obligationForm.paymentDate')} value={date} onChange={setDate} />
      <TextField
        label={t('obligationForm.paymentAmount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

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
  scrollWide: {
    width: '100%',
    maxWidth: layout.readableMaxWidth,
    alignSelf: 'center',
  },
  loading: {
    flex: 1,
    padding: space[4],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
  },
})
