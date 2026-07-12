import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, Card, FieldRow } from '@/core/design-system'
import { useAmortizationScheduleViewModel } from '@/features/schedule/hooks/use-amortization-schedule-view-model'
import type { Id } from '@eltizamati/domain'

export default function AmortizationScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useAmortizationScheduleViewModel(id as Id<'obligation'>)

  return (
    <>
      <Stack.Screen options={{ title: t('schedule.title', 'Schedule') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
        {viewModel.status === 'error' && <Text variant="body" color="critical">{t('schedule.error')}</Text>}
        {viewModel.status === 'unsupported' && <Text variant="body" color="secondary">{t('schedule.unsupported')}</Text>}
        {viewModel.status === 'refused' && <Text variant="body" color="critical">{t('error.calculationRefused')}</Text>}

        {viewModel.status === 'success' && viewModel.schedule.length === 0 && (
          <Text variant="body" color="secondary">{t('schedule.empty')}</Text>
        )}

        {viewModel.status === 'success' && viewModel.schedule.length > 0 && (
          <Card>
            {viewModel.schedule.map((entry) => (
              <View key={entry.period} style={styles.entry}>
                <View style={styles.entryTitle}>
                  <Text variant="heading">
                    {t('schedule.period')} {entry.period}
                  </Text>
                </View>
                <FieldRow label={t('schedule.installment')} value={entry.payment} />
                <FieldRow label={t('schedule.principalPortion')} value={entry.principal} />
                <FieldRow label={t('schedule.interestPortion')} value={entry.cost} />
                <FieldRow label={t('schedule.endingBalance')} value={entry.closingBalance} />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
  },
  entry: {
    marginBottom: space[4],
  },
  entryTitle: {
    marginBottom: space[2],
  },
})
