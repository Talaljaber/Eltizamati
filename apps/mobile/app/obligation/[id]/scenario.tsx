import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Amount,
  Card,
  ExplainLink,
  FieldRow,
  HeroAmount,
  InlineState,
  Text,
  TextField,
  space,
  layout,
  useResponsiveLayout,
} from '@/core/design-system'
import { useScenarioSimulator } from '@/features/scenario/hooks/use-scenario-simulator'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'
import {
  snapshotRecord,
  snapshotNumber,
  snapshotMoneyAmount,
} from '@/services/calculation-snapshot'
import { Money, engineEstimate, type Id } from '@eltizamati/domain'

const SCENARIO_FORMULA_ID = 'extraPaymentScenario'

export default function ScenarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useScenarioSimulator(id as Id<'obligation'>)
  const [explainVisible, setExplainVisible] = useState(false)
  const { isWideWeb } = useResponsiveLayout()

  return (
    <>
      <Stack.Screen options={{ title: t('scenario.title', 'Scenario Simulator') }} />
      <ScrollView contentContainerStyle={[styles.scroll, isWideWeb && styles.scrollWide]}>
        <Card>
          <View style={styles.sectionTitle}>
            <Text variant="heading">
              {t('scenario.whatIf', { amount: viewModel.draftExtraMonthly })}
            </Text>
          </View>

          <TextField
            label={t('scenario.extraMonthlyLabel')}
            value={String(viewModel.draftExtraMonthly)}
            onChangeText={(text) => {
              const parsed = Number(text.replace(/[^0-9.]/g, ''))
              viewModel.setDraftExtraMonthly(Number.isFinite(parsed) ? parsed : 0)
            }}
            keyboardType="decimal-pad"
            testID="scenario-extra-monthly-input"
          />
          <TextField
            label={t('scenario.oneTimeLabel', 'One-time extra payment')}
            value={String(viewModel.oneTimeAmount)}
            onChangeText={(text) => {
              const parsed = Number(text.replace(/[^0-9.]/g, ''))
              viewModel.setOneTimeAmount(Number.isFinite(parsed) ? parsed : 0)
            }}
            keyboardType="decimal-pad"
            testID="scenario-one-time-input"
          />

          {viewModel.status === 'loading' && (
            <InlineState kind="loading" message={t('common.loading')} />
          )}
          {viewModel.status === 'error' && (
            <InlineState kind="error" message={t('scenario.error')} />
          )}
          {viewModel.status === 'unsupported' && (
            <InlineState kind="unsupported" message={t('scenario.unsupported')} />
          )}
          {viewModel.status === 'refused' && (
            <InlineState kind="refused" message={t('error.calculationRefused')} />
          )}

          {viewModel.status === 'success' &&
            viewModel.run &&
            viewModel.run.outcome.kind === 'result' && (
              <View>
                {(() => {
                  const snapshot = snapshotRecord(viewModel.run.outcome.resultSnapshot)
                  const monthsSaved = snapshotNumber(snapshot.monthsSaved)
                  const costSaved = snapshotMoneyAmount(snapshot.costSaved)
                  const basePayoffPeriod = snapshotNumber(snapshot.basePayoffPeriod)
                  const scenarioPayoffPeriod = snapshotNumber(snapshot.scenarioPayoffPeriod)
                  const baseResidual = snapshotMoneyAmount(snapshot.baseResidualAtMaturity)
                  const scenarioResidual = snapshotMoneyAmount(snapshot.scenarioResidualAtMaturity)
                  const run = viewModel.run

                  return (
                    <>
                      {costSaved !== undefined ? (
                        <HeroAmount
                          label={t('scenario.costSaved')}
                          money={Money.of(costSaved, 'JOD')}
                          provenance={
                            engineEstimate(Money.of(costSaved, 'JOD'), run.id, run.calculatedAt)
                              .provenance
                          }
                          precision="estimate"
                          onExplain={() => setExplainVisible(true)}
                          supporting={
                            monthsSaved !== undefined
                              ? [
                                  {
                                    label: t('scenario.monthsSaved'),
                                    value: <Text variant="amountSm">{monthsSaved}</Text>,
                                  },
                                ]
                              : undefined
                          }
                        />
                      ) : null}

                      <View style={styles.comparisonRow}>
                        <View style={styles.comparisonColumn}>
                          <Text variant="bodySmall" color="secondary" align="center">
                            {t('scenario.currentLabel')}
                          </Text>
                          <FieldRow
                            label={t('scenario.payoffPeriod')}
                            value={
                              basePayoffPeriod !== undefined
                                ? String(basePayoffPeriod)
                                : t('common.unknown')
                            }
                          />
                          <FieldRow
                            label={t('scenario.residualAtMaturity')}
                            value={
                              baseResidual !== undefined ? (
                                <Amount
                                  money={Money.of(baseResidual, 'JOD')}
                                  provenance={
                                    engineEstimate(
                                      Money.of(baseResidual, 'JOD'),
                                      run.id,
                                      run.calculatedAt,
                                    ).provenance
                                  }
                                  precision="estimate"
                                />
                              ) : (
                                t('common.unknown')
                              )
                            }
                          />
                        </View>
                        <View style={styles.comparisonColumn}>
                          <Text variant="bodySmall" color="brand" align="center">
                            {t('scenario.scenarioLabel')}
                          </Text>
                          <FieldRow
                            label={t('scenario.payoffPeriod')}
                            value={
                              scenarioPayoffPeriod !== undefined
                                ? String(scenarioPayoffPeriod)
                                : t('common.unknown')
                            }
                          />
                          <FieldRow
                            label={t('scenario.residualAtMaturity')}
                            value={
                              scenarioResidual !== undefined ? (
                                <Amount
                                  money={Money.of(scenarioResidual, 'JOD')}
                                  provenance={
                                    engineEstimate(
                                      Money.of(scenarioResidual, 'JOD'),
                                      run.id,
                                      run.calculatedAt,
                                    ).provenance
                                  }
                                  precision="estimate"
                                />
                              ) : (
                                t('common.unknown')
                              )
                            }
                          />
                        </View>
                      </View>

                      {__DEV__ && viewModel.perfMs !== undefined && (
                        <Text variant="bodySmall" color="secondary" testID="scenario-perf">
                          {t('scenario.perfLabel', { ms: Math.round(viewModel.perfMs) })}
                        </Text>
                      )}

                      <ExplainLink onPress={() => setExplainVisible(true)} />
                    </>
                  )
                })()}
              </View>
            )}
        </Card>
      </ScrollView>

      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        obligationId={id as Id<'obligation'>}
        formulaId={SCENARIO_FORMULA_ID}
      />
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
  sectionTitle: {
    marginBottom: space[4],
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: space[4],
    marginTop: space[4],
    marginBottom: space[4],
  },
  comparisonColumn: {
    flex: 1,
    gap: space[1],
  },
})
