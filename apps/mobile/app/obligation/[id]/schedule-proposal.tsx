import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Amount,
  Button,
  Card,
  InlineState,
  InsightBanner,
  Text,
  TextField,
  layout,
  space,
  useResponsiveLayout,
} from '@/core/design-system'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'
import { calculationAsOf } from '@/services/calculation-as-of'
import { ScheduleProposalService } from '@/services/schedule-proposal-service'
import {
  applicableRatePeriods,
  rateHistoryFingerprint,
} from '@/features/rate-impact/projection-display'
import { ScheduleList } from '@/features/schedule/components/ScheduleList'
import type { AmortizationScheduleRow } from '@/features/schedule/hooks/use-amortization-schedule-view-model'
import { Money, toLocalDate, type Id, type Provenance } from '@eltizamati/domain'

const proposalService = new ScheduleProposalService()

interface ProposalResult {
  readonly installment: Money
  readonly projectedRemainingPayable: Money
  readonly residual: Money
  readonly schedule: readonly AmortizationScheduleRow[]
}

export default function ScheduleProposalScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>()
  const isCustom = mode === 'custom'
  const obligationId = id as Id<'obligation'>
  const router = useRouter()
  const { t } = useTranslation()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const personalAsOf = usePersonalCalculationAsOf()
  const { isWideWeb } = useResponsiveLayout()
  const [installmentDraft, setInstallmentDraft] = useState('')
  const [proposal, setProposal] = useState<ProposalResult | undefined>()
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const { data: obligation, isError: obligationError } = useQuery({
    queryKey: ['obligation', activeUser ?? '', obligationId],
    queryFn: async () => {
      const result = await repos.obligationRepository.get(obligationId)
      if (!result.ok) throw result.error
      return result.value
    },
  })
  const { data: ratePeriods, isError: rateError } = useQuery({
    queryKey: ['ratePeriods', activeUser ?? '', obligationId],
    queryFn: async () => {
      const result = await repos.ratePeriodRepository.historyFor(obligationId)
      if (!result.ok) throw result.error
      return result.value
    },
    enabled: obligation?.kind === 'conventionalLoan',
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const asOf = calculationAsOf(
    typeof repos.reset === 'function' ? 'demo' : 'personal',
    personalAsOf,
  )
  const rateFingerprint = rateHistoryFingerprint(ratePeriods)

  useEffect(() => {
    if (obligation?.kind === 'conventionalLoan' && installmentDraft.length === 0) {
      setInstallmentDraft(obligation.loanDetails.installment.value.toStorageString())
    }
  }, [installmentDraft.length, obligation])

  useEffect(() => {
    setProposal(undefined)
    setAccepted(false)
  }, [rateFingerprint])

  const currentRatePercent = useMemo(
    () => applicableRatePeriods(ratePeriods, asOf)[0]?.annualRate.toPercent().toFixed(3),
    [asOf, ratePeriods],
  )
  const proposalProvenance: Provenance = {
    source: 'estimate',
    providerId: 'schedule-proposal',
    observedAt: `${asOf}T00:00:00.000Z`,
    recordedAt: `${asOf}T00:00:00.000Z`,
  }

  function editInstallment(value: string) {
    setInstallmentDraft(value)
    setProposal(undefined)
    setAccepted(false)
    setError(undefined)
  }

  function calculateProposal() {
    if (obligation?.kind !== 'conventionalLoan' || ratePeriods === undefined) return
    let installment = obligation.loanDetails.installment.value
    if (isCustom) {
      try {
        installment = Money.of(installmentDraft, obligation.currency)
      } catch {
        setError(t('scheduleProposal.invalidInstallment'))
        return
      }
    }
    const result = isCustom
      ? proposalService.calculate(obligation, ratePeriods, installment, asOf)
      : proposalService.calculateRecommended(obligation, ratePeriods, asOf)
    if (!result.ok) {
      setError(t('scheduleProposal.calculationError'))
      return
    }

    let total = Money.zero(obligation.currency)
    let previousCost: number | undefined
    let remaining = result.value.schedule
      .filter((entry) => entry.date > asOf)
      .map((entry) => {
        total = total.add(entry.payment)
        const cost = Number(entry.cost.toStorageString())
        const change =
          previousCost === undefined || previousCost === 0
            ? undefined
            : ((cost - previousCost) / previousCost) * 100
        previousCost = cost
        return {
          period: entry.period,
          date: entry.date,
          payment: entry.payment.toStorageString(),
          principal: entry.principal.toStorageString(),
          cost: entry.cost.toStorageString(),
          closingBalance: entry.closingBalance.toStorageString(),
          costPercentChangeFromPrevious: change,
        }
      })
    const residual = result.value.projectedResidualAtMaturity
    if (isCustom && residual.isPositive() && remaining.length > 0) {
      const finalIndex = remaining.length - 1
      remaining = remaining.map((entry, index) =>
        index === finalIndex
          ? {
              ...entry,
              finalBalloonAmount: residual.toStorageString(),
              finalBalloonKind: 'projected' as const,
            }
          : entry,
      )
    }
    setProposal({
      installment:
        remaining[0] === undefined
          ? installment
          : Money.of(remaining[0].payment, obligation.currency),
      projectedRemainingPayable: total.add(residual),
      residual,
      schedule: remaining,
    })
    setAccepted(false)
    setError(undefined)
  }

  function renderAmount(value: string) {
    if (!obligation) return value
    return (
      <Amount
        money={Money.of(value, obligation.currency)}
        provenance={proposalProvenance}
        precision="estimate"
      />
    )
  }

  async function submitForBankReview() {
    if (
      !activeUser ||
      proposal === undefined ||
      ratePeriods === undefined ||
      obligation?.kind !== 'conventionalLoan'
    )
      return
    setSubmitting(true)
    const result = await repos.loanScheduleProposalRepository.submit(activeUser, {
      obligationId,
      kind: isCustom ? 'custom' : 'recommended',
      currency: obligation.currency,
      asOf,
      proposedInstallment: proposal.installment.toStorageString(),
      projectedRemainingPayable: proposal.projectedRemainingPayable.toStorageString(),
      finalBalloon: proposal.residual.toStorageString(),
      rateHistorySnapshot: ratePeriods.map((period) => ({
        annualRate: period.annualRate.toStorageString(),
        effectiveFrom: period.effectiveFrom,
      })),
      schedule: proposal.schedule.map((entry) => ({
        period: entry.period,
        date: toLocalDate(entry.date),
        payment: entry.payment,
        principal: entry.principal,
        cost: entry.cost,
        closingBalance: entry.closingBalance,
        ...(entry.finalBalloonAmount === undefined
          ? {}
          : { finalBalloonAmount: entry.finalBalloonAmount }),
      })),
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(t('scheduleProposal.submitError'))
      return
    }
    setAccepted(true)
    setError(undefined)
  }

  if (obligationError || rateError) {
    return <InlineState kind="error" message={t('scheduleProposal.loadError')} />
  }
  if (!obligation || (obligation.kind === 'conventionalLoan' && !ratePeriods)) {
    return <InlineState kind="loading" message={t('common.loading')} />
  }
  if (obligation.kind !== 'conventionalLoan') {
    return <InlineState kind="unsupported" message={t('schedule.unsupported')} />
  }

  const proposalForm = (
    <View style={styles.header}>
      <Card surface="flat">
        <View style={styles.content}>
          <Text variant="heading">
            {t(isCustom ? 'scheduleGenerator.title' : 'scheduleProposal.title')}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {t(
              isCustom ? 'scheduleGenerator.nonBindingNotice' : 'scheduleProposal.nonBindingNotice',
            )}
          </Text>
          {currentRatePercent !== undefined && (
            <Text variant="bodySmall">
              {t('scheduleProposal.appliedRate', { rate: currentRatePercent })}
            </Text>
          )}
          {isCustom && (
            <TextField
              label={t('scheduleProposal.installment')}
              value={installmentDraft}
              onChangeText={editInstallment}
              keyboardType="decimal-pad"
            />
          )}
          {error !== undefined && <Text color="critical">{error}</Text>}
          <Button
            label={t(isCustom ? 'scheduleGenerator.calculate' : 'scheduleProposal.calculate')}
            onPress={calculateProposal}
          />
        </View>
      </Card>

      {proposal !== undefined && (
        <Card>
          <View style={styles.content}>
            <Text variant="heading">{t('scheduleProposal.summary')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t(
                isCustom
                  ? 'scheduleGenerator.resultInstallment'
                  : 'scheduleProposal.recommendedInstallment',
              )}
            </Text>
            <Amount
              money={proposal.installment}
              provenance={proposalProvenance}
              precision="estimate"
            />
            <Text variant="bodySmall" color="secondary">
              {t('scheduleProposal.projectedRemainingPayable')}
            </Text>
            <Amount
              money={proposal.projectedRemainingPayable}
              provenance={proposalProvenance}
              precision="estimate"
            />
            {proposal.residual.isPositive() && (
              <InsightBanner
                severity="attention"
                title={t('scheduleGenerator.finalBalloonTitle', {
                  amount: proposal.residual.toStorageString(),
                })}
                body={t('scheduleGenerator.finalBalloonNotice')}
              />
            )}
            {accepted ? (
              <Text variant="bodySmall" color="positive">
                {t('scheduleProposal.acceptedLocally')}
              </Text>
            ) : (
              <View style={styles.actions}>
                <Button
                  label={t('scheduleProposal.accept')}
                  onPress={() => void submitForBankReview()}
                  loading={submitting}
                />
                <Button
                  label={t('scheduleProposal.reject')}
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </View>
            )}
          </View>
        </Card>
      )}
    </View>
  )

  return (
    <>
      <Stack.Screen
        options={{ title: t(isCustom ? 'scheduleGenerator.title' : 'scheduleProposal.title') }}
      />
      <View style={[styles.root, isWideWeb && styles.rootWide]}>
        {proposal === undefined ? (
          <ScrollView contentContainerStyle={styles.scroll}>{proposalForm}</ScrollView>
        ) : (
          <ScheduleList
            schedule={proposal.schedule}
            renderAmount={renderAmount}
            header={proposalForm}
          />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootWide: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  scroll: { padding: space[4] },
  header: { gap: space[4], padding: space[4] },
  content: { gap: space[3] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
})
