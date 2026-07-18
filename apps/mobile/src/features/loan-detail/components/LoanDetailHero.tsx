import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Amount, HeroAmount, InsightBanner, Text } from '@/core/design-system'
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

  if (!hero.currentBalance || !hero.currentBalanceProvenance) {
    return <Text color="secondary">{t('common.unknown', 'Unknown')}</Text>
  }

  const residualLabel =
    hero.residualConfidence === 'official'
      ? t('loanDetail.deterministic', 'Deterministic')
      : t('loanDetail.estimated', 'Estimated')

  return (
    <>
      <HeroAmount
        label={t('loanDetail.currentBalance', 'Current balance')}
        money={hero.currentBalance}
        provenance={hero.currentBalanceProvenance}
        precision={hero.currentBalancePrecision}
        supporting={[
          ...(hero.currentRatePercent !== undefined
            ? [
                {
                  label: t('loanDetail.currentPublishedRate'),
                  value: (
                    <Text variant="amountSm">
                      {hero.previousRatePercent !== undefined
                        ? `${hero.previousRatePercent}% → ${hero.currentRatePercent}%`
                        : `${hero.currentRatePercent}%`}
                    </Text>
                  ),
                },
              ]
            : []),
          ...(hero.projectedRemainingPayable && hero.projectedRemainingPayableProvenance
            ? [
                {
                  label: t('loanDetail.projectedRemainingPayable'),
                  value: (
                    <Amount
                      variant="amountSm"
                      money={hero.projectedRemainingPayable}
                      provenance={hero.projectedRemainingPayableProvenance}
                      precision="estimate"
                    />
                  ),
                },
              ]
            : []),
          ...(hero.estimatedResidual && hero.estimatedResidualProvenance
            ? [
                {
                  label: `${t('loanDetail.projectedResidual', 'Estimated Residual at Maturity')} · ${residualLabel}`,
                  value: (
                    <Amount
                      variant="amountSm"
                      money={hero.estimatedResidual}
                      provenance={hero.estimatedResidualProvenance}
                      precision="estimate"
                      onPress={
                        hero.residualCalculationRunId !== undefined
                          ? () => setExplainVisible(true)
                          : undefined
                      }
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
      {hero.estimatedResidual?.isPositive() === true && (
        <InsightBanner
          severity="attention"
          title={t('loanDetail.scheduleChangeTitle')}
          body={t('loanDetail.scheduleChangeNotice')}
        />
      )}
      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        obligationId={obligationId}
        formulaId={RESIDUAL_FORMULA_ID}
      />
    </>
  )
}
