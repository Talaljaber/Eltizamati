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
        {viewModel.status === 'error' && (
          <Text variant="body" color="critical">
            {t('rateHistory.error')}
          </Text>
        )}

        {viewModel.status === 'success' && viewModel.periods.length === 0 && (
          <Text variant="body" color="secondary">
            {t('rateHistory.empty')}
          </Text>
        )}

        {viewModel.status === 'success' && viewModel.periods.length > 0 && (
          <Card>
            {viewModel.periods.map((row, idx) => (
              <TimelineItem
                key={row.period.effectiveFrom}
                isLast={idx === viewModel.periods.length - 1}
              >
                <View style={styles.periodContent}>
                  <View style={styles.rateRow}>
                    <Text variant="heading">
                      {t('rateHistory.annualRate', {
                        rate: row.period.annualRate.toStorageString(),
                      })}
                    </Text>
                    {row.percentChangeFromPrevious !== undefined && (
                      <Text
                        variant="bodySmall"
                        color={row.percentChangeFromPrevious > 0 ? 'critical' : 'positive'}
                      >
                        {row.percentChangeFromPrevious > 0
                          ? t('rateHistory.increaseBadge', {
                              percent: row.percentChangeFromPrevious.toFixed(1),
                            })
                          : t('rateHistory.decreaseBadge', {
                              percent: Math.abs(row.percentChangeFromPrevious).toFixed(1),
                            })}
                      </Text>
                    )}
                  </View>
                  <Text variant="bodySmall" color="secondary">
                    {t('rateHistory.effectiveFrom')}: {row.period.effectiveFrom}
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
    paddingStart: space[3],
    paddingBottom: space[2],
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
})
