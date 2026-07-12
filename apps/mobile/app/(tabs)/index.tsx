/**
 * Home Tab — Phase 5 Dashboard.
 *
 * Shows Total Commitments, Next Payment, and Insights Preview.
 *
 * Uses DemoBanner per C-07 rules.
 * Uses TanStack Query hooks for data fetching.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, space, useTheme, radius, DemoBanner, SkeletonCard } from '@/core/design-system'
import { useObligations } from '@/features/home/api/use-obligations'
import { useInsights } from '@/features/home/api/use-insights'
import { useHomeAggregates } from '@/features/home/hooks/use-home-aggregates'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { formatMoneyOfficial, formatMoneyEstimate } from '@/core/formatting/format-money'
import type { Insight, Id } from '@eltizamati/domain'

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
          <Text variant="display">{'👋'}</Text>
          <View>
            <Text variant="title">{t('home.greeting')}</Text>
            <Text variant="body" color="secondary">
              {t('home.subtitle')}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingGroup}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={styles.dashboard}>
            <SummaryCard aggregates={aggregates} theme={theme} />
            <InsightsPreview insights={insights ?? []} theme={theme} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function SummaryCard({
  aggregates,
  theme,
}: {
  aggregates: ReturnType<typeof useHomeAggregates>
  theme: ReturnType<typeof useTheme>
}) {
  const { t } = useTranslation()

  const totalText =
    aggregates.status === 'success' && aggregates.totalMonthlyCommitment
      ? aggregates.includesEstimates === true
        ? formatMoneyEstimate(aggregates.totalMonthlyCommitment, aggregates.totalMonthlyCommitment.currency)
        : formatMoneyOfficial(aggregates.totalMonthlyCommitment, aggregates.totalMonthlyCommitment.currency)
      : t('home.totalPending')

  const nextPaymentText =
    aggregates.status === 'success' && aggregates.nextDueAmount
      ? formatMoneyEstimate(aggregates.nextDueAmount, aggregates.nextDueAmount.currency)
      : t('home.totalPending')

  return (
    <View style={[styles.card, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
      <View style={styles.metric}>
        <Text variant="bodySmall" color="secondary">
          {t('home.totalLabel')}
        </Text>
        <Text variant="amountLg" color="primary">
          {totalText}
        </Text>
      </View>
      <View style={styles.metric}>
        <Text variant="bodySmall" color="secondary">
          {t('home.nextPaymentLabel')}
        </Text>
        <Text variant="amountMd" color="secondary">
          {nextPaymentText}
        </Text>
      </View>
    </View>
  )
}

function InsightsPreview({
  insights,
  theme,
}: {
  insights: readonly Insight[]
  theme: ReturnType<typeof useTheme>
}) {
  const { t } = useTranslation()

  if (insights.length === 0) {
    return (
      <View style={styles.insightsGroup}>
        <View style={styles.insightsHeader}>
          <Text variant="heading">{t('home.insightsTitle')}</Text>
        </View>
        <View style={[styles.emptyInsight, { backgroundColor: theme.bgSubtle }]}>
          <Text variant="body" color="secondary">
            {t('home.noInsights')}
          </Text>
        </View>
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
          <View key={insight.id} style={[styles.insightCard, { backgroundColor: theme.infoSoft }]}>
            <Text variant="bodySmall" color="primary">
              {/* Note: insight body template resolution is simplified here */}
              {t(`insights.${insight.ruleId}.title`, { defaultValue: insight.ruleId })}
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  loadingGroup: {
    padding: space[4],
    gap: space[4],
  },
  dashboard: {
    padding: space[4],
    gap: space[6],
  },
  card: {
    padding: space[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space[4],
  },
  metric: {
    gap: space[1],
  },
  insightsGroup: {
    gap: space[3],
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyInsight: {
    padding: space[4],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  insightsList: {
    gap: space[2],
  },
  insightCard: {
    padding: space[3],
    borderRadius: radius.md,
  },
})
