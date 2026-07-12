import { useState } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, Card, FieldRow, Amount } from '@/core/design-system'
import { useAmortizationScheduleViewModel } from '@/features/schedule/hooks/use-amortization-schedule-view-model'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'
import { Money, engineEstimate, type Id } from '@eltizamati/domain'

const PROJECTION_FORMULA_ID = 'variableProjection'

export default function AmortizationScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useAmortizationScheduleViewModel(id as Id<'obligation'>)
  const [explainVisible, setExplainVisible] = useState(false)

  function renderEstimatedAmount(amount: string) {
    const run = viewModel.run
    if (amount === '?' || run === undefined) return t('common.unknown')
    const money = Money.of(amount, 'JOD')
    return (
      <Amount
        money={money}
        provenance={engineEstimate(money, run.id, run.calculatedAt).provenance}
        precision="estimate"
        onPress={() => setExplainVisible(true)}
      />
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('schedule.title', 'Schedule'),
          headerRight: () =>
            viewModel.status === 'success' ? (
              <TouchableOpacity onPress={() => setExplainVisible(true)}>
                <Text variant="bodySmall" color="primary">
                  {t('common.explain')}
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
        {viewModel.status === 'error' && (
          <Text variant="body" color="critical">
            {t('schedule.error')}
          </Text>
        )}
        {viewModel.status === 'unsupported' && (
          <Text variant="body" color="secondary">
            {t('schedule.unsupported')}
          </Text>
        )}
        {viewModel.status === 'refused' && (
          <Text variant="body" color="critical">
            {t('error.calculationRefused')}
          </Text>
        )}

        {viewModel.status === 'success' && viewModel.schedule.length === 0 && (
          <Text variant="body" color="secondary">
            {t('schedule.empty')}
          </Text>
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
                {viewModel.run &&
                  (
                    [
                      [t('schedule.installment'), entry.payment],
                      [t('schedule.principalPortion'), entry.principal],
                      [t('schedule.interestPortion'), entry.cost],
                      [t('schedule.endingBalance'), entry.closingBalance],
                    ] as const
                  ).map(([label, amount]) => (
                    <FieldRow key={label} label={label} value={renderEstimatedAmount(amount)} />
                  ))}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        obligationId={id as Id<'obligation'>}
        formulaId={PROJECTION_FORMULA_ID}
      />
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
