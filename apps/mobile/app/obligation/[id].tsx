import { useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  space,
  useTheme,
  DemoBanner,
  SkeletonCard,
  StatusChip,
  ProvenanceBadge,
  EmptyState,
  Button,
  Card,
  SectionHeader,
  ListRow,
  Amount,
} from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { deriveObligationStatus } from '@eltizamati/domain'
import type { Id, ObligationKind } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'
import { useLoanDetailViewModel } from '@/features/loan-detail/hooks/use-loan-detail-view-model'
import { LoanDetailHero } from '@/features/loan-detail/components/LoanDetailHero'
import { useInsightsViewModel } from '@/features/insights/hooks/use-insights-view-model'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useMurabahaDetailViewModel } from '@/features/murabaha-detail/hooks/use-murabaha-detail-view-model'
import { MurabahaDetailSection } from '@/features/murabaha-detail/components/MurabahaDetailSection'
import { CardDetailSection } from '@/features/card-detail/components/CardDetailSection'
import { useCardInsightEvaluation } from '@/features/card-detail/hooks/use-card-insight-evaluation'
import { useUserThresholdInsightEvaluation } from '@/features/loan-detail/hooks/use-user-threshold-insight-evaluation'
import { ObligationService } from '@/services/obligation-service'

export default function ObligationDetailScreen() {
  return (
    <RequireRepositories>
      <ObligationDetailInner />
    </RequireRepositories>
  )
}

function ObligationDetailInner() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const viewModel = useLoanDetailViewModel(id as Id<'obligation'>)
  const insightsViewModel = useInsightsViewModel(id as Id<'obligation'>)
  const murabahaViewModel = useMurabahaDetailViewModel(id as Id<'obligation'>)
  const repositories = useRepositories()
  const isDemo = typeof repositories.reset === 'function'
  useCardInsightEvaluation(
    viewModel.obligation?.kind === 'creditCard' ? viewModel.obligation : undefined,
  )
  useUserThresholdInsightEvaluation(
    viewModel.obligation?.kind === 'conventionalLoan' ? viewModel.obligation : undefined,
    viewModel.hero?.estimatedResidual,
  )
  const queryClient = useQueryClient()
  const obligationService = useMemo(() => new ObligationService(), [])
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (viewModel.status === 'error') {
    return (
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.root, { backgroundColor: theme.bg }]}
      >
        {isDemo && <DemoBanner />}
        <EmptyState
          title={t('obligationDetail.notFoundTitle')}
          subtitle={t('obligationDetail.notFoundSubtitle')}
        />
      </SafeAreaView>
    )
  }

  if (viewModel.status === 'loading' || !viewModel.obligation) {
    return (
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.root, { backgroundColor: theme.bg }]}
      >
        {isDemo && <DemoBanner />}
        <View style={styles.loadingGroup}>
          <SkeletonCard />
        </View>
      </SafeAreaView>
    )
  }

  const obligation = viewModel.obligation

  const status = deriveObligationStatus({
    obligation,
    payments: viewModel.payments ?? [],
    insights: insightsViewModel.status === 'success' ? insightsViewModel.insights : [],
    today: DEMO_DATE,
  })

  async function performArchive() {
    setArchiving(true)
    const result = await obligationService.archiveObligation(obligation.id, repositories)
    setArchiving(false)
    if (result.ok) {
      await queryClient.invalidateQueries()
      router.back()
    }
  }

  function handleArchive() {
    Alert.alert(
      t('obligationDetail.archiveConfirmTitle'),
      t('obligationDetail.archiveConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('obligationDetail.archiveConfirmAction'),
          style: 'destructive',
          onPress: () => void performArchive(),
        },
      ],
    )
  }

  async function performDelete() {
    setDeleting(true)
    const result = await obligationService.deleteObligation(obligation.id, repositories)
    setDeleting(false)
    if (result.ok) {
      await queryClient.invalidateQueries()
      router.replace('/(tabs)/obligations')
    }
  }

  function handleDelete() {
    Alert.alert(t('obligationDetail.deleteConfirmTitle'), t('obligationDetail.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('obligationDetail.deleteConfirmAction'),
        style: 'destructive',
        onPress: () => void performDelete(),
      },
    ])
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.root, { backgroundColor: theme.bg }]}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              label={t('insights.title', 'Insights Center')}
              variant="secondary"
              onPress={() => router.push('/insights')}
            />
          ),
        }}
      />
      {isDemo && <DemoBanner />}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="display">
            {(obligation.kind as ObligationKind) === 'creditCard'
              ? '💳'
              : (obligation.kind as ObligationKind) === 'conventionalLoan'
                ? '🏦'
                : '🤝'}
          </Text>
          <Text variant="title">{obligation.institution.name}</Text>
          <View style={styles.badges}>
            <StatusChip status={status} />
            <ProvenanceBadge source={obligation.provenance.source} />
          </View>
        </View>

        <View style={styles.manageRow}>
          <Button
            label={t('obligationDetail.edit')}
            variant="secondary"
            onPress={() => router.push(`/obligation/${id}/edit`)}
          />
          <Button
            label={t('obligationDetail.logPayment')}
            variant="secondary"
            onPress={() => router.push(`/obligation/${id}/log-payment`)}
          />
          <Button
            label={t('obligationDetail.archive')}
            variant="secondary"
            onPress={handleArchive}
            loading={archiving}
          />
          <Button
            label={t('obligationDetail.delete')}
            variant="destructive"
            onPress={handleDelete}
            loading={deleting}
          />
        </View>

        {viewModel.hero && <LoanDetailHero obligationId={obligation.id} hero={viewModel.hero} />}

        {obligation.kind === 'conventionalLoan' ? (
          <View style={styles.navigationGrid}>
            <Button
              label={t('loanDetail.navRateHistory', 'Rate History')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/rate-history`)}
            />
            <Button
              label={t('loanDetail.navRateImpact', 'Rate Impact')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/rate-impact`)}
            />
            <Button
              label={t('loanDetail.navSchedule', 'Schedule')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/schedule`)}
            />
            <Button
              label={t('loanDetail.navScenario', 'Simulator')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/scenario`)}
            />
            <Button
              label={t('loanDetail.navBankQuestions', 'Bank Questions')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/bank-questions`)}
            />
            <Button
              label={t('obligationDetail.logRateChange')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/log-rate`)}
            />
          </View>
        ) : obligation.kind === 'murabaha' ? (
          <MurabahaDetailSection
            obligationId={obligation.id}
            obligation={obligation}
            progress={murabahaViewModel.progress}
          />
        ) : obligation.kind === 'creditCard' ? (
          <CardDetailSection obligation={obligation} />
        ) : (
          <Text variant="bodySmall" color="secondary">
            {t('obligationDetail.phaseNote')}
          </Text>
        )}

        <View style={styles.paymentHistory}>
          <SectionHeader title={t('obligationDetail.paymentHistory', 'Payment History')} />
          {(viewModel.payments ?? []).length === 0 ? (
            <Text variant="bodySmall" color="secondary">
              {t('obligationDetail.noPayments', 'No payments recorded yet.')}
            </Text>
          ) : (
            <Card>
              {[...(viewModel.payments ?? [])]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((payment) => (
                  <ListRow
                    key={payment.id}
                    trailing={
                      <Amount
                        money={payment.amount}
                        provenance={payment.provenance}
                        precision={
                          payment.provenance.source === 'estimate' ? 'estimate' : 'official'
                        }
                      />
                    }
                  >
                    <Text variant="body">{payment.date}</Text>
                    <Text variant="bodySmall" color="secondary">
                      {payment.allocation === undefined
                        ? t('obligationDetail.allocationUnknown', 'Split not available')
                        : payment.allocation.allocationSource === 'estimated'
                          ? t('obligationDetail.allocationEstimated', 'Estimated split')
                          : t('obligationDetail.allocationOfficial', 'Official split')}
                    </Text>
                  </ListRow>
                ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingGroup: {
    padding: space[4],
  },
  scroll: {
    padding: space[4],
    gap: space[6],
    paddingBottom: space[8],
  },
  header: {
    alignItems: 'center',
    gap: space[2],
  },
  badges: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  manageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    justifyContent: 'center',
  },
  navigationGrid: {
    gap: space[3],
    marginTop: space[4],
  },
  paymentHistory: {
    marginTop: space[4],
  },
})
