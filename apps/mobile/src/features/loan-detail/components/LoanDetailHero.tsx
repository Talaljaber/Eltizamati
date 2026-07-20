import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Amount, Button, HeroAmount, InsightBanner, Text } from '@/core/design-system'
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
  const router = useRouter()
  const [explainVisible, setExplainVisible] = useState(false)

  const mainAmount = hero.remainingToPay ?? hero.currentBalance
  const mainProvenance =
    hero.remainingToPay !== undefined ? hero.remainingToPayProvenance : hero.currentBalanceProvenance
  const mainLabel =
    hero.remainingToPay !== undefined ? t('loanDetail.remainingToPay') : t('loanDetail.currentBalance')
  const mainPrecision = hero.remainingToPay !== undefined ? 'estimate' : hero.currentBalancePrecision

  if (!mainAmount || !mainProvenance) {
    return <Text color="secondary">{t('common.unknown', 'Unknown')}</Text>
  }

  const residualLabel =
    hero.residualConfidence === 'official'
      ? t('loanDetail.deterministic', 'Deterministic')
      : t('loanDetail.estimated', 'Estimated')

  return (
    <>
      <HeroAmount
        label={mainLabel}
        money={mainAmount}
        provenance={mainProvenance}
        precision={mainPrecision}
        supporting={[
          ...(hero.remainingToPay !== undefined && hero.currentBalance && hero.currentBalanceProvenance
            ? [
                {
                  label: t('loanDetail.currentBalance'),
                  value: (
                    <Amount
                      variant="amountSm"
                      money={hero.currentBalance}
                      provenance={hero.currentBalanceProvenance}
                      precision={hero.currentBalancePrecision}
                    />
                  ),
                },
              ]
            : []),
          ...(hero.paidToDate?.isPositive() === true
            ? [
                {
                  label: t('loanDetail.paidToDate'),
                  value: (
                    <Amount
                      variant="amountSm"
                      money={hero.paidToDate}
                      provenance={mainProvenance}
                      precision="estimate"
                    />
                  ),
                },
              ]
            : []),
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
      {(hero.scheduleStale === true || hero.estimatedResidual?.isPositive() === true) && (
        <InsightBanner
          severity="attention"
          title={t('loanDetail.scheduleChangeTitle')}
          body={t('loanDetail.scheduleChangeNotice')}
        />
      )}
      {hero.scheduleStale === true && (
        <Button
          variant="ghost"
          label={t('schedule.viewRecommended')}
          onPress={() => router.push(`/obligation/${obligationId}/schedule-proposal?mode=recommended`)}
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
