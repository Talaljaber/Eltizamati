import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Text, Button, TextField, space } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { toLocalDate, type Id } from '@eltizamati/domain'
import { ObligationService } from '@/services/obligation-service'
import { isValidDecimal, isValidLocalDate } from '@/features/obligation-form/validation'

const service = new ObligationService()

export default function LogRateChangeScreen() {
  return (
    <RequireRepositories>
      <LogRateChangeInner />
    </RequireRepositories>
  )
}

function LogRateChangeInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const obligationId = id as Id<'obligation'>

  const { data: obligation, isLoading } = useQuery({
    queryKey: ['obligation', activeUser ?? '', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [annualRatePercent, setAnnualRatePercent] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!obligation || obligation.kind !== 'conventionalLoan') return
    if (!isValidLocalDate(effectiveFrom)) return setError(t('obligationForm.errors.date'))
    if (!isValidDecimal(annualRatePercent)) return setError(t('obligationForm.errors.percent'))
    setError(undefined)
    setSaving(true)
    const result = await service.logRateChange(
      obligation,
      toLocalDate(effectiveFrom),
      annualRatePercent,
      repos,
    )
    setSaving(false)
    if (!result.ok) return setError(t('obligationForm.errors.rateOverlap'))
    await queryClient.invalidateQueries()
    router.back()
  }

  if (isLoading || !obligation) {
    return (
      <View style={styles.loading}>
        <Text variant="body">{t('common.loading')}</Text>
      </View>
    )
  }

  if (obligation.kind !== 'conventionalLoan') {
    return (
      <View style={styles.loading}>
        <Text variant="body" color="secondary">
          {t('obligationForm.rateChangeNotApplicable')}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('obligationForm.logRateTitle') }} />
      <TextField
        label={t('obligationForm.rateEffectiveFrom')}
        value={effectiveFrom}
        onChangeText={setEffectiveFrom}
        placeholder="YYYY-MM-DD"
      />
      <TextField
        label={t('obligationForm.annualRatePercent')}
        value={annualRatePercent}
        onChangeText={setAnnualRatePercent}
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
