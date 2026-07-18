import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Amount,
  ExplainLink,
  InlineState,
  space,
  layout,
  useResponsiveLayout,
} from '@/core/design-system'
import { useAmortizationScheduleViewModel } from '@/features/schedule/hooks/use-amortization-schedule-view-model'
import { ScheduleList } from '@/features/schedule/components/ScheduleList'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'
import { Money, engineEstimate, type Id } from '@eltizamati/domain'

const PROJECTION_FORMULA_ID = 'variableProjection'

export default function AmortizationScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useAmortizationScheduleViewModel(id as Id<'obligation'>)
  const [explainVisible, setExplainVisible] = useState(false)
  const { isWideWeb } = useResponsiveLayout()

  function renderEstimatedAmount(amount: string) {
    const run = viewModel.run
    if (amount === '?' || run === undefined) return t('common.unknown')
    const money = Money.of(amount, 'JOD')
    return (
      <Amount
        money={money}
        provenance={engineEstimate(money, run.id, run.calculatedAt).provenance}
        precision="estimate"
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
              <ExplainLink onPress={() => setExplainVisible(true)} />
            ) : null,
        }}
      />
      <View style={[styles.root, isWideWeb && styles.rootWide]}>
        {viewModel.status === 'loading' && (
          <View style={styles.stateContainer}>
            <InlineState kind="loading" message={t('common.loading')} />
          </View>
        )}
        {viewModel.status === 'error' && (
          <View style={styles.stateContainer}>
            <InlineState kind="error" message={t('schedule.error')} />
          </View>
        )}
        {viewModel.status === 'unsupported' && (
          <View style={styles.stateContainer}>
            <InlineState kind="unsupported" message={t('schedule.unsupported')} />
          </View>
        )}
        {viewModel.status === 'refused' && (
          <View style={styles.stateContainer}>
            <InlineState kind="refused" message={t('error.calculationRefused')} />
          </View>
        )}
        {viewModel.status === 'success' && viewModel.schedule.length === 0 && (
          <View style={styles.stateContainer}>
            <InlineState kind="empty" message={t('schedule.empty')} />
          </View>
        )}

        {viewModel.status === 'success' && viewModel.schedule.length > 0 && (
          <ScheduleList schedule={viewModel.schedule} renderAmount={renderEstimatedAmount} />
        )}
      </View>

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
  root: {
    flex: 1,
  },
  rootWide: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  stateContainer: {
    padding: space[4],
  },
})
