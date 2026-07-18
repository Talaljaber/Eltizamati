/**
 * Home Tab — financial overview (Phase 8.5 Workstream 4 representative screen).
 *
 * Shows Total Commitments, Next Payment, and Insights Preview.
 *
 * Uses DemoBanner per C-07 rules.
 * Uses TanStack Query hooks for data fetching.
 */

import { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  Text,
  space,
  radius,
  useTheme,
  brandPalette,
  DemoBanner,
  SkeletonCard,
  Card,
  Amount,
  InsightBanner,
  Button,
  ErrorState,
  PageContent,
  ResponsiveGrid,
} from '@/core/design-system'
import { useObligations } from '@/features/home/api/use-obligations'
import { useInsights } from '@/features/home/api/use-insights'
import { useHomeAggregates } from '@/features/home/hooks/use-home-aggregates'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUserState } from '@/features/auth/hooks/use-active-user'
import { toBannerSeverity } from '@/features/insights/severity'
import {
  engineEstimate,
  makeError,
  resolveMonthlyCommitment,
  Money,
  type AppError,
  type Insight,
  type Id,
  type LocalDate,
  type Obligation,
  type ObligationKind,
  type Provenance,
} from '@eltizamati/domain'
import appIcon from '../../assets/icon.png'
import { calculationAsOfForObligations } from '@/services/calculation-as-of'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'
import { toErrorUiState } from '@/core/errors/error-ui-state'

const EMPTY_OBLIGATIONS: readonly Obligation[] = []

interface QuickAction {
  readonly key: string
  readonly icon: keyof typeof Ionicons.glyphMap
  readonly label: string
  readonly onPress: () => void
}

export default function HomeTab() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const repos = useRepositories()
  const activeUserState = useActiveUserState()
  const isDemoMode = activeUserState.status === 'demo'
  const activeUser = activeUserState.userId
  const personalAsOf = usePersonalCalculationAsOf()
  const [manualRefreshing, setManualRefreshing] = useState(false)

  const {
    data: obligations,
    isLoading: isObligationsLoading,
    error: obligationsErrorValue,
    refetch: refetchObligations,
  } = useObligations(repos.obligationRepository, activeUser ?? ('' as Id<'user'>), isDemoMode)

  const {
    data: insights,
    isLoading: isInsightsLoading,
    error: insightsErrorValue,
    refetch: refetchInsights,
  } = useInsights(repos.insightRepository, activeUser ?? ('' as Id<'user'>), isDemoMode)

  const obligationsError = (obligationsErrorValue as AppError | null) ?? undefined
  const insightsError = (insightsErrorValue as AppError | null) ?? undefined
  const obligationsForCalculation = obligations ?? EMPTY_OBLIGATIONS
  const asOf = calculationAsOfForObligations(isDemoMode ? 'demo' : 'personal', personalAsOf)
  const aggregates = useHomeAggregates(
    obligationsForCalculation,
    asOf,
    obligations !== undefined && obligationsError === undefined,
  )

  const activeUserError = activeUserState.status === 'error' ? activeUserState.error : undefined
  const queryError = activeUserError ?? obligationsError ?? insightsError
  const hasRetainedQueryData =
    obligations !== undefined &&
    insights !== undefined &&
    queryError?.retryable === true &&
    queryError.code !== 'auth'
  const sessionRevoked =
    activeUserState.status === 'signedOut' ||
    queryError?.code === 'auth' ||
    aggregates.error?.code === 'auth'
  const isLoading =
    activeUserState.status === 'loading' || isObligationsLoading || isInsightsLoading

  const handleRefresh = async () => {
    setManualRefreshing(true)
    try {
      await Promise.all([refetchObligations(), refetchInsights()])
    } finally {
      setManualRefreshing(false)
    }
  }

  useEffect(() => {
    if (sessionRevoked) router.replace('/auth/sign-in')
  }, [router, sessionRevoked])

  if (sessionRevoked) {
    return (
      <HomeTerminalState
        isDemoMode={isDemoMode}
        error={makeError('auth')}
        testID="home-session-revoked"
      />
    )
  }

  if (queryError !== undefined && !hasRetainedQueryData) {
    return (
      <HomeTerminalState
        isDemoMode={isDemoMode}
        error={queryError}
        onRetry={() => {
          void handleRefresh()
        }}
        testID="home-query-error"
      />
    )
  }

  if (isLoading || obligations === undefined || insights === undefined) {
    return (
      <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
        <DemoBanner visible={isDemoMode} testID="home-demo-banner" />
        <View style={styles.loadingGroup} testID="home-loading">
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    )
  }

  const quickActions: QuickAction[] = [
    {
      key: 'obligations',
      icon: 'list-outline',
      label: t('tabs.obligations'),
      onPress: () => router.push('/(tabs)/obligations'),
    },
    {
      key: 'add',
      icon: 'add-circle-outline',
      label: t('obligationForm.addTitle'),
      onPress: () => router.push('/obligation/add'),
    },
    {
      key: 'insights',
      icon: 'bulb-outline',
      label: t('insights.title'),
      onPress: () => router.push('/insights'),
    },
    {
      key: 'settings',
      icon: 'settings-outline',
      label: t('navigation.settings'),
      onPress: () => router.push('/settings/'),
    },
  ]

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
      <DemoBanner visible={isDemoMode} testID="home-demo-banner" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            testID="home-refresh-control"
            onRefresh={() => {
              void handleRefresh()
            }}
            tintColor={theme.brand}
          />
        }
      >
        <PageContent maxWidth="content">
          <View style={[styles.hero, { backgroundColor: theme.brand }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBrandMark}>
                <Image
                  source={appIcon}
                  style={styles.heroBrandMarkImage}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <Text variant="bodySmall" color="onBrand">
                {t('common.appName', 'Eltizamati')}
              </Text>
            </View>
            <Text variant="title" color="onBrand">
              {t('home.greeting')}
            </Text>
            <Text variant="body" color="onBrand">
              {t('home.subtitle')}
            </Text>
          </View>

          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={styles.quickAction}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                hitSlop={4}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.bgSubtle }]}>
                  <Ionicons name={action.icon} size={22} color={theme.brand} />
                </View>
                <Text variant="caption" color="secondary" align="center" numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dashboard}>
            {queryError !== undefined ? (
              <StaleDataNotice
                error={queryError}
                onRetry={() => {
                  void handleRefresh()
                }}
                testID="home-stale-query-data"
              />
            ) : null}
            {aggregates.status === 'error' && aggregates.error !== undefined ? (
              <ErrorState
                state={toErrorUiState(aggregates.error)}
                onRetry={aggregates.retry}
                testID="home-aggregate-error"
              />
            ) : (
              <>
                {aggregates.isStale === true && aggregates.error !== undefined ? (
                  <StaleDataNotice
                    error={aggregates.error}
                    onRetry={aggregates.retry}
                    testID="home-stale-aggregate-data"
                  />
                ) : null}
                <ResponsiveGrid minColumnWidth={360}>
                  <SummaryCard aggregates={aggregates} />
                  <InsightsPreview insights={insights} />
                </ResponsiveGrid>
                <CommitmentBreakdown obligations={obligationsForCalculation} asOf={asOf} />
              </>
            )}
            {aggregates.status === 'error' ? <InsightsPreview insights={insights} /> : null}
          </View>
        </PageContent>
      </ScrollView>
    </SafeAreaView>
  )
}

function HomeTerminalState({
  isDemoMode,
  error,
  onRetry,
  testID,
}: {
  isDemoMode: boolean
  error: AppError
  onRetry?: () => void
  testID: string
}) {
  const theme = useTheme()
  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
      <DemoBanner visible={isDemoMode} testID="home-demo-banner" />
      <ErrorState state={toErrorUiState(error)} onRetry={onRetry} testID={testID} />
    </SafeAreaView>
  )
}

function StaleDataNotice({
  error,
  onRetry,
  testID,
}: {
  error: AppError
  onRetry: () => void
  testID: string
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  return (
    <View
      style={[styles.staleNotice, { backgroundColor: theme.cautionSoft }]}
      testID={testID}
      accessible
      accessibilityRole="alert"
    >
      <Text variant="bodySmall" color="caution">
        {t('error.staleDataTitle')}
      </Text>
      <Text variant="caption" color="secondary">
        {t(error.userMessageKey)}
      </Text>
      <Button variant="ghost" label={t('common.retry')} onPress={onRetry} />
    </View>
  )
}

function amountPrecision(isEstimate: boolean): 'official' | 'estimate' {
  return isEstimate ? 'estimate' : 'official'
}

export function SummaryCard({ aggregates }: { aggregates: ReturnType<typeof useHomeAggregates> }) {
  const { t } = useTranslation()

  const total =
    aggregates.status === 'success' &&
    aggregates.totalMonthlyCommitment !== undefined &&
    aggregates.calculationRunId !== undefined &&
    aggregates.calculatedAt !== undefined
      ? {
          money: aggregates.totalMonthlyCommitment,
          provenance: engineEstimate(
            aggregates.totalMonthlyCommitment,
            aggregates.calculationRunId,
            aggregates.calculatedAt,
          ).provenance,
          // This is an engine-calculated output regardless of the quality class
          // of its inputs. `hasEstimatedInputs` must not alter output provenance.
          precision: 'estimate' as const,
        }
      : undefined

  const nextDue =
    aggregates.status === 'success' &&
    aggregates.nextDueAmount !== undefined &&
    aggregates.nextDueAmountProvenance !== undefined
      ? {
          money: aggregates.nextDueAmount,
          provenance: aggregates.nextDueAmountProvenance,
          precision: amountPrecision(aggregates.nextDueAmountProvenance.source === 'estimate'),
        }
      : undefined

  return (
    <Card>
      <View style={styles.metric}>
        <Text variant="bodySmall" color="secondary">
          {t('home.totalLabel')}
        </Text>
        {total ? (
          <Amount
            testID="home-total-amount"
            variant="amountHero"
            money={total.money}
            provenance={total.provenance}
            precision={total.precision}
          />
        ) : (
          <Text variant="amountHero" color="secondary">
            {t('home.totalPending')}
          </Text>
        )}
      </View>
      <View style={[styles.metric, styles.metricSpaced]}>
        <Text variant="bodySmall" color="secondary">
          {t('home.nextPaymentLabel')}
        </Text>
        {nextDue ? (
          <Amount
            testID="home-next-payment-amount"
            variant="amountMd"
            money={nextDue.money}
            provenance={nextDue.provenance}
            precision={nextDue.precision}
          />
        ) : (
          <Text variant="amountMd" color="secondary">
            {t('home.totalPending')}
          </Text>
        )}
      </View>
    </Card>
  )
}

function InsightsPreview({ insights }: { insights: readonly Insight[] }) {
  const { t } = useTranslation()

  if (insights.length === 0) {
    return (
      <View style={styles.insightsGroup}>
        <View style={styles.insightsHeader}>
          <Text variant="heading">{t('home.insightsTitle')}</Text>
        </View>
        <Card surface="flat">
          <Text variant="body" color="secondary" align="center">
            {t('home.noInsights')}
          </Text>
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.insightsGroup}>
      <View style={styles.insightsHeader}>
        <Text variant="heading">{t('home.insightsTitle')}</Text>
        {insights.length > 3 && (
          <Text variant="bodySmall" color="brand">
            {t('home.viewAll')}
          </Text>
        )}
      </View>
      <View style={styles.insightsList}>
        {insights.slice(0, 3).map((insight) => (
          <InsightBanner
            key={insight.id}
            severity={toBannerSeverity(insight.severity)}
            title={t(`insights.${insight.ruleId}.title`, { defaultValue: insight.ruleId })}
            body={t(insight.bodyKey, insight.params)}
            unread={insight.readAt === undefined}
          />
        ))}
      </View>
    </View>
  )
}

/** Same "client-derived amount, never inherits an 'official' source" rule
 * card-detail's available-credit figure uses — this is a plain sum over
 * already-fetched Money values, not a finance-engine calculation run. */
function derivedEstimateProvenance(recordedAt: string): Provenance {
  return { source: 'estimate', observedAt: recordedAt, recordedAt }
}

const BREAKDOWN_KIND_COLOR: Record<ObligationKind, keyof ReturnType<typeof useTheme>> = {
  conventionalLoan: 'brand',
  creditCard: 'understanding',
  murabaha: 'support',
  genericFacility: 'caution',
  ijara: 'info',
  diminishingMusharakah: 'positive',
}

function CommitmentBreakdown({
  obligations,
  asOf,
}: {
  obligations: readonly Obligation[]
  asOf: LocalDate
}) {
  const { t } = useTranslation()
  const theme = useTheme()

  const byKind = new Map<ObligationKind, Money>()
  for (const obligation of obligations) {
    const commitment = resolveMonthlyCommitment(obligation, asOf)
    if (commitment === undefined) continue
    const existing = byKind.get(obligation.kind) ?? Money.zero(commitment.value.currency)
    byKind.set(obligation.kind, existing.add(commitment.value))
  }

  const entries = Array.from(byKind.entries())
  if (entries.length === 0) return null

  let total = Money.zero(entries[0][1].currency)
  for (const [, amount] of entries) total = total.add(amount)
  if (total.isZero()) return null

  const provenance = derivedEstimateProvenance(new Date().toISOString())
  const segments = entries
    .map(([kind, amount]) => ({
      kind,
      amount,
      color: theme[BREAKDOWN_KIND_COLOR[kind]],
      ratio: amount.toDecimal().dividedBy(total.toDecimal()).toNumber(),
    }))
    .sort((a, b) => b.ratio - a.ratio)

  return (
    <Card>
      <View style={styles.breakdownHeader}>
        <Text variant="heading">{t('home.commitmentBreakdownTitle')}</Text>
        <Amount
          testID="home-breakdown-total"
          variant="amountMd"
          money={total}
          provenance={provenance}
          precision="estimate"
        />
      </View>
      <View style={styles.breakdownBar}>
        {segments.map(({ kind, color, ratio }) => (
          <View
            key={kind}
            style={[
              styles.breakdownSegment,
              { flexGrow: Math.max(ratio, 0.03), backgroundColor: color },
            ]}
          />
        ))}
      </View>
      <View style={styles.breakdownLegend}>
        {segments.map(({ kind, amount, color, ratio }) => (
          <View key={kind} style={styles.breakdownLegendRow}>
            <View style={[styles.breakdownDot, { backgroundColor: color }]} />
            <View style={styles.breakdownLegendLabel}>
              <Text variant="bodySmall">{t(`obligationKind.${kind}`)}</Text>
            </View>
            <Text variant="caption" color="secondary">
              {Math.round(ratio * 100)}%
            </Text>
            <Amount
              testID={`home-breakdown-${kind}`}
              variant="amountSm"
              money={amount}
              provenance={provenance}
              precision="estimate"
            />
          </View>
        ))}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space[8],
  },
  hero: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[7],
    gap: space[1],
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginBottom: space[2],
  },
  heroBrandMark: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: brandPalette.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBrandMarkImage: {
    width: '100%',
    height: '100%',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    marginTop: -space[6],
    marginBottom: space[2],
  },
  quickAction: {
    alignItems: 'center',
    gap: space[1],
    width: 72,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingGroup: {
    padding: space[4],
    gap: space[4],
  },
  dashboard: {
    padding: space[4],
    gap: space[6],
  },
  staleNotice: {
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
  },
  metric: {
    gap: space[1],
  },
  metricSpaced: {
    marginTop: space[4],
  },
  insightsGroup: {
    gap: space[3],
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsList: {
    gap: space[2],
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space[4],
  },
  breakdownBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
    gap: 2,
    marginBottom: space[4],
  },
  breakdownSegment: {
    minWidth: 4,
    borderRadius: radius.full,
  },
  breakdownLegend: {
    gap: space[3],
  },
  breakdownLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  breakdownLegendLabel: {
    flex: 1,
  },
})
