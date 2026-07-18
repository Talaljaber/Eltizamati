import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Text,
  space,
  layout,
  useResponsiveLayout,
  TimelineItem,
  Card,
  InlineState,
} from '@/core/design-system'
import { useRateHistoryViewModel } from '@/features/rate-history/hooks/use-rate-history-view-model'
import type { Id } from '@eltizamati/domain'

export default function RateHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useRateHistoryViewModel(id as Id<'obligation'>)
  const { isWideWeb } = useResponsiveLayout()

  return (
    <>
      <Stack.Screen options={{ title: t('rateHistory.title') }} />
      <ScrollView contentContainerStyle={[styles.scroll, isWideWeb && styles.scrollWide]}>
        {viewModel.status === 'loading' && (
          <InlineState kind="loading" message={t('common.loading')} />
        )}
        {viewModel.status === 'error' && (
          <InlineState kind="error" message={t('rateHistory.error')} />
        )}

        {viewModel.status === 'success' && viewModel.periods.length === 0 && (
          <InlineState kind="empty" message={t('rateHistory.empty')} />
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
                        rate: row.period.annualRate.toPercent().toFixed(3),
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
  scrollWide: {
    width: '100%',
    maxWidth: layout.readableMaxWidth,
    alignSelf: 'center',
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
