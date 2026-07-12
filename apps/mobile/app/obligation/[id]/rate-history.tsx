import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, TimelineItem, Card } from '@/core/design-system'
import { useRateHistoryViewModel } from '@/features/rate-history/hooks/use-rate-history-view-model'
import type { Id } from '@eltizamati/domain'

export default function RateHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useRateHistoryViewModel(id as Id<'obligation'>)

  return (
    <>
      <Stack.Screen options={{ title: t('rateHistory.title') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
        {viewModel.status === 'error' && <Text variant="body" color="critical">{t('rateHistory.error')}</Text>}

        {viewModel.status === 'success' && viewModel.periods.length === 0 && (
          <Text variant="body" color="secondary">{t('rateHistory.empty')}</Text>
        )}

        {viewModel.status === 'success' && viewModel.periods.length > 0 && (
          <Card>
            {viewModel.periods.map((period, idx) => (
              <TimelineItem key={period.effectiveFrom} isLast={idx === viewModel.periods.length - 1}>
                <View style={styles.periodContent}>
                  <Text variant="heading">{period.annualRate.toStorageString()} / yr</Text>
                  <Text variant="bodySmall" color="secondary">
                    {t('rateHistory.effectiveFrom')}: {period.effectiveFrom}
                  </Text>
                </View>
              </TimelineItem>
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
  periodContent: {
    paddingLeft: space[3],
    paddingBottom: space[2],
  },
})
