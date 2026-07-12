import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, Card, FieldRow, Amount, space } from '@/core/design-system'
import type { Id } from '@eltizamati/domain'
import type { LoanDetailHeroModel } from '../hooks/use-loan-detail-view-model'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'

const RESIDUAL_FORMULA_ID = 'variableProjection'

export function LoanDetailHero({
  obligationId,
  hero,
}: {
  obligationId: Id<'obligation'>
  hero: LoanDetailHeroModel
}) {
  const { t } = useTranslation()
  const [explainVisible, setExplainVisible] = useState(false)

  return (
    <>
      <Card>
        <View style={styles.title}>
          <Text variant="heading">{t('loanDetail.heroTitle', 'Loan Overview')}</Text>
        </View>
        <View style={styles.numberGroup}>
          <FieldRow
            label={t('loanDetail.currentBalance', 'Current balance')}
            value={
              <Amount
                money={hero.currentBalance}
                provenance={hero.currentBalanceProvenance}
                precision={hero.currentBalancePrecision}
              />
            }
          />
        </View>
        <View style={[styles.numberGroup, styles.numberGroupSpaced]}>
          <FieldRow
            label={t('loanDetail.projectedResidual', 'Estimated Residual at Maturity')}
            value={
              hero.estimatedResidual && hero.estimatedResidualProvenance ? (
                <Amount
                  money={hero.estimatedResidual}
                  provenance={hero.estimatedResidualProvenance}
                  precision="estimate"
                  onPress={() => setExplainVisible(true)}
                />
              ) : (
                t('common.unknown', 'Unknown')
              )
            }
          />
          <View style={styles.residualMeta}>
            <Text variant="bodySmall" color="secondary">
              {hero.residualConfidence === 'official'
                ? t('loanDetail.deterministic', 'Deterministic')
                : t('loanDetail.estimated', 'Estimated')}
            </Text>
            {hero.residualCalculationRunId !== undefined && (
              <TouchableOpacity onPress={() => setExplainVisible(true)}>
                <Text variant="bodySmall" color="primary">
                  {t('common.explain', 'Explain')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        obligationId={obligationId}
        formulaId={RESIDUAL_FORMULA_ID}
      />
    </>
  )
}

const styles = StyleSheet.create({
  title: { marginBottom: space[4] },
  numberGroup: { gap: space[1] },
  numberGroupSpaced: { marginTop: space[4] },
  residualMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
  },
})
