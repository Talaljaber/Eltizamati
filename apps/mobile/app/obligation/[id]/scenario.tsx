import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, Card, FieldRow } from '@/core/design-system'
import { useScenarioSimulator } from '@/features/scenario/hooks/use-scenario-simulator'
import { snapshotRecord, snapshotNumber, snapshotMoneyAmount } from '@/services/calculation-snapshot'
import type { Id } from '@eltizamati/domain'

export default function ScenarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useScenarioSimulator(id as Id<'obligation'>)

  return (
    <>
      <Stack.Screen options={{ title: t('scenario.title', 'Scenario Simulator') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.sectionTitle}>
            <Text variant="heading">{t('scenario.whatIf', { amount: viewModel.extraMonthly })}</Text>
          </View>

          {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
          {viewModel.status === 'error' && <Text variant="body" color="critical">{t('scenario.error')}</Text>}
          {viewModel.status === 'unsupported' && <Text variant="body" color="secondary">{t('scenario.unsupported')}</Text>}
          {viewModel.status === 'refused' && <Text variant="body" color="critical">{t('error.calculationRefused')}</Text>}

          {viewModel.status === 'success' && viewModel.run && viewModel.run.outcome.kind === 'result' && (
            <View>
              {(() => {
                const snapshot = snapshotRecord(viewModel.run.outcome.resultSnapshot)
                const monthsSaved = snapshotNumber(snapshot.monthsSaved)
                const costSaved = snapshotMoneyAmount(snapshot.costSaved)
                return (
                  <>
                    <FieldRow
                      label={t('scenario.monthsSaved')}
                      value={monthsSaved !== undefined ? String(monthsSaved) : t('common.unknown')}
                    />
                    <FieldRow
                      label={t('scenario.costSaved')}
                      value={costSaved ?? t('common.unknown')}
                    />
                  </>
                )
              })()}
            </View>
          )}
        </Card>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
  },
  sectionTitle: {
    marginBottom: space[4],
  },
})
