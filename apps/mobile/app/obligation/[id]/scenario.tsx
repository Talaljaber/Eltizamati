import { useState } from 'react'
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, radius, useTheme, Card, FieldRow, Amount } from '@/core/design-system'
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
  const theme = useTheme()
  const viewModel = useScenarioSimulator(id as Id<'obligation'>)
  const [explainVisible, setExplainVisible] = useState(false)

  return (
    <>
      <Stack.Screen options={{ title: t('scenario.title', 'Scenario Simulator') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.sectionTitle}>
            <Text variant="heading">
              {t('scenario.whatIf', { amount: viewModel.draftExtraMonthly })}
            </Text>
          </View>

          <Text variant="bodySmall" color="secondary">
            {t('scenario.extraMonthlyLabel')}
          </Text>
          <TextInput
            value={String(viewModel.draftExtraMonthly)}
            onChangeText={(text) => {
              const parsed = Number(text.replace(/[^0-9.]/g, ''))
              viewModel.setDraftExtraMonthly(Number.isFinite(parsed) ? parsed : 0)
            }}
            keyboardType="numeric"
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.bg },
            ]}
            testID="scenario-extra-monthly-input"
          />
          <Text variant="bodySmall" color="secondary">
            {t('scenario.oneTimeLabel', 'One-time extra payment')}
          </Text>
          <TextInput
            value={String(viewModel.oneTimeAmount)}
            onChangeText={(text) => {
              const parsed = Number(text.replace(/[^0-9.]/g, ''))
              viewModel.setOneTimeAmount(Number.isFinite(parsed) ? parsed : 0)
            }}
            keyboardType="numeric"
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.bg },
            ]}
            testID="scenario-one-time-input"
          />

          {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
          {viewModel.status === 'error' && (
            <Text variant="body" color="critical">
              {t('scenario.error')}
            </Text>
          )}
          {viewModel.status === 'unsupported' && (
            <Text variant="body" color="secondary">
              {t('scenario.unsupported')}
            </Text>
          )}
          {viewModel.status === 'refused' && (
            <Text variant="body" color="critical">
              {t('error.calculationRefused')}
            </Text>
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

                  return (
                    <>
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
                                      viewModel.run.id,
                                      viewModel.run.calculatedAt,
                                    ).provenance
                                  }
                                  precision="estimate"
                                  onPress={() => setExplainVisible(true)}
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
                                      viewModel.run.id,
                                      viewModel.run.calculatedAt,
                                    ).provenance
                                  }
                                  precision="estimate"
                                  onPress={() => setExplainVisible(true)}
                                />
                              ) : (
                                t('common.unknown')
                              )
                            }
                          />
                        </View>
                      </View>

                      <FieldRow
                        label={t('scenario.monthsSaved')}
                        value={
                          monthsSaved !== undefined ? String(monthsSaved) : t('common.unknown')
                        }
                      />
                      <FieldRow
                        label={t('scenario.costSaved')}
                        value={
                          costSaved !== undefined ? (
                            <Amount
                              money={Money.of(costSaved, 'JOD')}
                              provenance={
                                engineEstimate(
                                  Money.of(costSaved, 'JOD'),
                                  viewModel.run.id,
                                  viewModel.run.calculatedAt,
                                ).provenance
                              }
                              precision="estimate"
                              onPress={() => setExplainVisible(true)}
                            />
                          ) : (
                            t('common.unknown')
                          )
                        }
                      />

                      {viewModel.perfMs !== undefined && (
                        <Text variant="bodySmall" color="secondary" testID="scenario-perf">
                          {t('scenario.perfLabel', { ms: Math.round(viewModel.perfMs) })}
                        </Text>
                      )}

                      <TouchableOpacity
                        onPress={() => setExplainVisible(true)}
                        style={styles.explainLink}
                      >
                        <Text variant="bodySmall" color="primary">
                          {t('common.explain')}
                        </Text>
                      </TouchableOpacity>
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
  sectionTitle: {
    marginBottom: space[4],
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginBottom: space[4],
    marginTop: space[1],
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: space[4],
    marginBottom: space[4],
  },
  comparisonColumn: {
    flex: 1,
    gap: space[1],
  },
  explainLink: {
    marginTop: space[3],
  },
})
