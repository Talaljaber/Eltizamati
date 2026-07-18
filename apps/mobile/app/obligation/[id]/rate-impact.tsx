import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, Card, FieldRow, Amount, ExplainLink, InlineState } from '@/core/design-system'
import { useRateImpactViewModel } from '@/features/rate-impact/hooks/use-rate-impact-view-model'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'
import { Money, engineEstimate, type Id } from '@eltizamati/domain'

const RESIDUAL_DETECTION_FORMULA_ID = 'residualDetection'

export default function RateImpactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useRateImpactViewModel(id as Id<'obligation'>)
  const [explainVisible, setExplainVisible] = useState(false)

  return (
    <>
      <Stack.Screen options={{ title: t('rateImpact.title', 'Rate Impact') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.status === 'loading' && (
          <InlineState kind="loading" message={t('common.loading')} />
        )}
        {viewModel.status === 'error' && (
          <InlineState kind="error" message={t('rateImpact.error')} />
        )}
        {viewModel.status === 'unsupported' && (
          <InlineState kind="unsupported" message={t('rateImpact.unsupported')} />
        )}
        {viewModel.status === 'refused' && (
          <InlineState kind="refused" message={t('error.calculationRefused')} />
        )}

        {viewModel.status === 'success' && (
          <Card>
            <View style={styles.sectionTitle}>
              <Text variant="heading">{t('rateImpact.summary')}</Text>
            </View>

            <FieldRow
              label={t('rateImpact.hasResidual')}
              value={viewModel.hasResidual ? t('common.yes') : t('common.no')}
              valueColor={viewModel.hasResidual ? 'critical' : 'positive'}
            />

            {viewModel.hasResidual && viewModel.residualAmount !== undefined && (
              <>
                <FieldRow
                  label={t('rateImpact.residualAmount')}
                  value={
                    viewModel.residualCalculationRunId !== undefined &&
                    viewModel.residualCalculatedAt !== undefined ? (
                      <Amount
                        money={Money.of(viewModel.residualAmount, 'JOD')}
                        provenance={
                          engineEstimate(
                            Money.of(viewModel.residualAmount, 'JOD'),
                            viewModel.residualCalculationRunId,
                            viewModel.residualCalculatedAt,
                          ).provenance
                        }
                        precision="estimate"
                        onPress={() => setExplainVisible(true)}
                      />
                    ) : (
                      viewModel.residualAmount
                    )
                  }
                />

                <View style={styles.meta}>
                  <Text variant="bodySmall" color="secondary">
                    {viewModel.residualConfidence === 'official'
                      ? t('rateImpact.confidenceDeterministic')
                      : t('rateImpact.confidenceEstimated')}
                  </Text>
                  {viewModel.residualCalculationRunId !== undefined && (
                    <ExplainLink onPress={() => setExplainVisible(true)} />
                  )}
                </View>

                {viewModel.residualCauses.length > 0 && (
                  <View style={styles.causes}>
                    <Text variant="bodySmall" color="secondary">
                      {t('rateImpact.causeTitle')}
                    </Text>
                    {viewModel.residualCauses.map((cause) => (
                      <Text key={cause} variant="body">
                        {t(`rateImpact.causes.${cause}`)}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={styles.addedCostRow}>
              <FieldRow
                label={t('rateImpact.addedCost')}
                value={viewModel.addedCostAvailable ? '' : t('rateImpact.addedCostPending')}
                valueColor="secondary"
              />
            </View>
          </Card>
        )}
      </ScrollView>

      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        obligationId={id as Id<'obligation'>}
        formulaId={RESIDUAL_DETECTION_FORMULA_ID}
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
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
    marginBottom: space[3],
  },
  causes: {
    gap: space[1],
    marginBottom: space[4],
  },
  addedCostRow: {
    marginTop: space[4],
  },
})
