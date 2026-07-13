/**
 * Home Tab — financial overview (Phase 8.5 Workstream 4 representative screen).
 *
 * Shows Total Commitments, Next Payment, and Insights Preview.
 *
 * Uses DemoBanner per C-07 rules.
 * Uses TanStack Query hooks for data fetching.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  space,
  useTheme,
  DemoBanner,
  SkeletonCard,
  Card,
  Amount,
  InsightBanner,
} from '@/core/design-system'
import { useObligations } from '@/features/home/api/use-obligations'
import { useInsights } from '@/features/home/api/use-insights'
import { useHomeAggregates } from '@/features/home/hooks/use-home-aggregates'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { toBannerSeverity } from '@/features/insights/severity'
import { engineEstimate, type Insight, type Id } from '@eltizamati/domain'

export default function HomeTab() {
  const { t } = useTranslation()
  const theme = useTheme()
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const {
    data: obligations,
    isLoading: isObligationsLoading,
    refetch: refetchObligations,
  } = useObligations(repos.obligationRepository, activeUser ?? ('' as Id<'user'>))

  const {
    data: insights,
    isLoading: isInsightsLoading,
    refetch: refetchInsights,
  } = useInsights(repos.insightRepository, activeUser ?? ('' as Id<'user'>))

  const aggregates = useHomeAggregates(obligations ?? [])

  const isLoading = isObligationsLoading || isInsightsLoading || !activeUser

  const handleRefresh = async () => {
    await Promise.all([refetchObligations(), refetchInsights()])
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.bg }]}>
      <DemoBanner visible={true} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void handleRefresh()
            }}
            tintColor={theme.brand}
          />
        }
      >
        <View style={styles.header}>
          <Text variant="title">{t('home.greeting')}</Text>
          <Text variant="body" color="secondary">
            {t('home.subtitle')}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingGroup}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={styles.dashboard}>
            <SummaryCard aggregates={aggregates} />
            <InsightsPreview insights={insights ?? []} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    padding: space[4],
    gap: space[1],
  },
  loadingGroup: {
    padding: space[4],
    gap: space[4],
  },
  dashboard: {
    padding: space[4],
    gap: space[6],
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
})
