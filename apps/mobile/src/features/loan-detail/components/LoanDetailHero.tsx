import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, Card, FieldRow, space } from '@/core/design-system'
import type { Id } from '@eltizamati/domain'
import type { LoanDetailHeroModel } from '../hooks/use-loan-detail-view-model'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'

/** Residual is projected via the variableProjection.v1 formula (see use-loan-detail-view-model). */
const RESIDUAL_FORMULA_ID = 'variableProjection'

export interface LoanDetailHeroProps {
  obligationId: Id<'obligation'>
  hero: LoanDetailHeroModel
}

export function LoanDetailHero({ obligationId, hero }: LoanDetailHeroProps) {
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
            label={t('loanDetail.officialBalance', 'Official Balance')}
            value={hero.officialBalance}
          />
          <View style={styles.meta}>
            <Text variant="bodySmall" color="secondary" align="end">
              {t('loanDetail.source', 'Source')}: {hero.officialBalanceSource} •{' '}
              {t('loanDetail.asOf', 'As of')}: {hero.officialBalanceAsOf}
            </Text>
          </View>
        </View>

        <View style={[styles.numberGroup, styles.numberGroupSpaced]}>
          <FieldRow
            label={t('loanDetail.projectedResidual', 'Estimated Residual at Maturity')}
            value={hero.estimatedResidual ?? t('common.unknown', 'Unknown')}
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
  title: {
    marginBottom: space[4],
  },
  numberGroup: {
    gap: space[1],
  },
  numberGroupSpaced: {
    marginTop: space[4],
  },
  meta: {
    alignItems: 'flex-end',
  },
  residualMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
  },
})
