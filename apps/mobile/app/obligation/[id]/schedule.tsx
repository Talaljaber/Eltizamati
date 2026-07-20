import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Amount,
  Button,
  Card,
  ExplainLink,
  InlineState,
  InsightBanner,
  Text,
  space,
  layout,
  useResponsiveLayout,
} from '@/core/design-system'
import { useAmortizationScheduleViewModel } from '@/features/schedule/hooks/use-amortization-schedule-view-model'
import { useMurabahaScheduleViewModel } from '@/features/schedule/hooks/use-murabaha-schedule-view-model'
import { ScheduleList } from '@/features/schedule/components/ScheduleList'
import { MurabahaScheduleList } from '@/features/schedule/components/MurabahaScheduleList'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'
import { Money, engineEstimate, type Id } from '@eltizamati/domain'

const PROJECTION_FORMULA_ID = 'variableProjection'

export default function AmortizationScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const viewModel = useAmortizationScheduleViewModel(id as Id<'obligation'>)
  const murabahaViewModel = useMurabahaScheduleViewModel(id as Id<'obligation'>)
  const [explainVisible, setExplainVisible] = useState(false)
  const { isWideWeb } = useResponsiveLayout()

  function renderEstimatedAmount(amount: string) {
    const run = viewModel.run
    if (amount === '?') return t('common.unknown')
    const money = Money.of(amount, 'JOD')
    const provenance =
      run === undefined
        ? {
            source: 'official' as const,
            providerId: 'bank-simulator-dashboard',
            observedAt: viewModel.approvedAgreementAt ?? new Date().toISOString(),
            recordedAt: viewModel.approvedAgreementAt ?? new Date().toISOString(),
          }
        : engineEstimate(money, run.id, run.calculatedAt).provenance
    return (
      <Amount
        money={money}
        provenance={provenance}
        precision={run === undefined ? 'official' : 'estimate'}
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
        {/* Murabaha has its own fixed-installment schedule; when it applies it
         * takes precedence over the conventional amortization flow (which
         * reports 'unsupported' for this kind). */}
        {murabahaViewModel.status === 'loading' && (
          <View style={styles.stateContainer}>
            <InlineState kind="loading" message={t('common.loading')} />
          </View>
        )}
        {murabahaViewModel.status === 'error' && (
          <View style={styles.stateContainer}>
            <InlineState kind="error" message={t('schedule.error')} />
          </View>
        )}
        {murabahaViewModel.status === 'success' && (
          <MurabahaScheduleList viewModel={murabahaViewModel} />
        )}

        {murabahaViewModel.status === 'notApplicable' && (
          <>
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
        {viewModel.status === 'success' &&
          viewModel.schedule.length === 0 &&
          viewModel.pendingProposalExists !== true && (
            <View style={styles.stateContainer}>
              <InlineState kind="empty" message={t('schedule.empty')} />
            </View>
          )}
        {viewModel.status === 'success' &&
          viewModel.schedule.length === 0 &&
          viewModel.pendingProposalExists === true && (
            <View style={styles.stateContainer}>
              <InsightBanner
                severity="attention"
                title={t('schedule.pendingProposalTitle')}
                body={t('schedule.pendingProposalBody')}
              />
              <Button
                variant="ghost"
                label={t('schedule.viewRecommended')}
                onPress={() => router.push(`/obligation/${id}/schedule-proposal?mode=recommended`)}
              />
            </View>
          )}

        {viewModel.status === 'success' && viewModel.schedule.length > 0 && (
          <>
            <View style={styles.summary}>
              <Card surface="flat">
                <View style={styles.summaryContent}>
                  <Text variant="heading">{t('schedule.remainingSchedule')}</Text>
                  {viewModel.currentRatePercent !== undefined && (
                    <Text variant="bodySmall">
                      {t('schedule.appliedRate', {
                        rate: viewModel.currentRatePercent,
                        previousRate: viewModel.previousRatePercent,
                      })}
                    </Text>
                  )}
                  {viewModel.projectedRemainingPayable !== undefined && (
                    <View>
                      <Text variant="bodySmall" color="secondary">
                        {t('schedule.projectedRemainingPayable')}
                      </Text>
                      {renderEstimatedAmount(viewModel.projectedRemainingPayable)}
                    </View>
                  )}
                  {viewModel.projectedResidualAtMaturity !== undefined &&
                    Money.of(viewModel.projectedResidualAtMaturity, 'JOD').isPositive() && (
                      <InsightBanner
                        severity="attention"
                        title={t('schedule.finalBalloonTitle')}
                        body={t('schedule.finalBalloonNotice')}
                      />
                    )}
                  {viewModel.scheduleStale === true && (
                    <>
                      <InsightBanner
                        severity="attention"
                        title={t('schedule.outdatedTitle')}
                        body={t('schedule.outdatedNotice')}
                      />
                      <Button
                        variant="ghost"
                        label={t('schedule.viewRecommended')}
                        onPress={() => router.push(`/obligation/${id}/schedule-proposal?mode=recommended`)}
                      />
                    </>
                  )}
                </View>
              </Card>
            </View>
            <ScheduleList schedule={viewModel.schedule} renderAmount={renderEstimatedAmount} />
          </>
        )}
          </>
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
  summary: {
    padding: space[4],
    paddingBottom: 0,
  },
  summaryContent: {
    gap: space[2],
  },
})
