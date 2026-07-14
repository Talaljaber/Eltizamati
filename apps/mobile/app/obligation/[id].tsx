import { useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, I18nManager, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  Text,
  space,
  radius,
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
import type {
  Id,
  ObligationKind,
  Obligation,
  Payment,
  Insight,
  LocalDate,
} from '@eltizamati/domain'
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
import { calculationAsOf } from '@/services/calculation-as-of'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'

const KIND_ICON: Record<ObligationKind, keyof typeof Ionicons.glyphMap> = {
  creditCard: 'card-outline',
  conventionalLoan: 'business-outline',
  murabaha: 'storefront-outline',
  genericFacility: 'briefcase-outline',
  ijara: 'key-outline',
  diminishingMusharakah: 'people-outline',
}

export function deriveDetailObligationStatus(
  obligation: Obligation,
  payments: readonly Payment[],
  insights: readonly Insight[],
  asOf: LocalDate,
) {
  return deriveObligationStatus({ obligation, payments, insights, today: asOf })
}

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
  const personalAsOf = usePersonalCalculationAsOf()
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
  const asOf = calculationAsOf(isDemo ? 'demo' : 'personal', personalAsOf)

  const status = deriveDetailObligationStatus(
    obligation,
    viewModel.payments ?? [],
    insightsViewModel.status === 'success' ? insightsViewModel.insights : [],
    asOf,
  )

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
            <Pressable
              onPress={() => router.push('/insights')}
              accessibilityRole="button"
              accessibilityLabel={t('insights.title', 'Insights Center')}
              hitSlop={8}
              style={styles.headerAction}
            >
              <Ionicons name="bulb-outline" size={24} color={theme.understanding} />
            </Pressable>
          ),
        }}
      />
      {isDemo && <DemoBanner />}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={[styles.kindIcon, { backgroundColor: theme.bgSubtle }]}>
            <Ionicons
              name={KIND_ICON[obligation.kind as ObligationKind]}
              size={24}
              color={theme.textSecondary}
            />
          </View>
          <Text variant="title">{obligation.institution.name}</Text>
          <View style={styles.badges}>
            <StatusChip status={status} />
            <ProvenanceBadge source={obligation.provenance.source} />
          </View>
          {obligation.provenance.providerId === 'mock-open-banking' && (
            <Text variant="bodySmall" color="critical">
              {t('mockConnect.mockBadge')}
            </Text>
          )}
        </View>

        {viewModel.hero && <LoanDetailHero obligationId={obligation.id} hero={viewModel.hero} />}

        <View style={styles.primaryActions}>
          <View style={styles.primaryActionItem}>
            <Button
              label={t('obligationDetail.logPayment')}
              onPress={() => router.push(`/obligation/${id}/log-payment`)}
            />
          </View>
          <View style={styles.primaryActionItem}>
            <Button
              label={t('obligationDetail.edit')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${id}/edit`)}
            />
          </View>
        </View>

        {obligation.kind === 'conventionalLoan' ? (
          <View
            style={[
              styles.navGroup,
              { backgroundColor: theme.bgElevated, borderColor: theme.border },
            ]}
          >
            <NavRow
              icon="time-outline"
              label={t('loanDetail.navRateHistory', 'Rate History')}
              onPress={() => router.push(`/obligation/${id}/rate-history`)}
            />
            <NavRow
              icon="trending-up-outline"
              label={t('loanDetail.navRateImpact', 'Rate Impact')}
              onPress={() => router.push(`/obligation/${id}/rate-impact`)}
            />
            <NavRow
              icon="calendar-outline"
              label={t('loanDetail.navSchedule', 'Schedule')}
              onPress={() => router.push(`/obligation/${id}/schedule`)}
            />
            <NavRow
              icon="calculator-outline"
              label={t('loanDetail.navScenario', 'Simulator')}
              onPress={() => router.push(`/obligation/${id}/scenario`)}
            />
            <NavRow
              icon="help-circle-outline"
              label={t('loanDetail.navBankQuestions', 'Bank Questions')}
              onPress={() => router.push(`/obligation/${id}/bank-questions`)}
            />
            <NavRow
              icon="create-outline"
              label={t('obligationDetail.logRateChange')}
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
          <View style={styles.detailSection}>
            <CardDetailSection obligation={obligation} />
            <Button
              label={t('cardSimulator.open')}
              variant="secondary"
              onPress={() => router.push(`/obligation/${obligation.id}/card-simulator`)}
            />
          </View>
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

        <ObligationManageActions
          archiving={archiving}
          deleting={deleting}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export function NavRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  const theme = useTheme()
  const chevronIcon: keyof typeof Ionicons.glyphMap = I18nManager.isRTL
    ? 'chevron-back-outline'
    : 'chevron-forward-outline'
  return (
    <ListRow
      onPress={onPress}
      accessibilityLabel={label}
      leading={<Ionicons name={icon} size={20} color={theme.textSecondary} />}
      trailing={<Ionicons name={chevronIcon} size={18} color={theme.textTertiary} />}
    >
      <Text variant="body">{label}</Text>
    </ListRow>
  )
}

export function ObligationManageActions({
  archiving,
  deleting,
  onArchive,
  onDelete,
}: {
  archiving: boolean
  deleting: boolean
  onArchive: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <View style={styles.dangerZone} testID="obligation-manage-actions">
      <SectionHeader title={t('obligationDetail.manage', 'Manage')} />
      <Button
        label={t('obligationDetail.archive')}
        variant="secondary"
        onPress={onArchive}
        loading={archiving}
      />
      <Button
        label={t('obligationDetail.delete')}
        variant="destructive"
        onPress={onDelete}
        loading={deleting}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerAction: {
    marginEnd: space[2],
    padding: space[1],
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
  kindIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  primaryActions: {
    flexDirection: 'row',
    gap: space[3],
  },
  primaryActionItem: {
    flex: 1,
  },
  navGroup: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  paymentHistory: {
    marginTop: space[4],
  },
  dangerZone: {
    marginTop: space[6],
    gap: space[3],
  },
  detailSection: { gap: space[4] },
})
