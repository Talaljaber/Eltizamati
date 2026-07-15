/**
 * Obligations List Tab — Phase 5.
 *
 * Lists all obligations for the user. Uses DemoBanner.
 * Includes derived status mapping via StatusChip.
 *
 * Filters (All / Loans / Cards / Islamic) are visually present
 * but we just render "All" in Phase 5 for simplicity unless there's time.
 */

import { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  Text,
  space,
  radius,
  useTheme,
  DemoBanner,
  SkeletonCard,
  ListRow,
  StatusChip,
  EmptyState,
  Amount,
  Button,
  ErrorState,
} from '@/core/design-system'
import { useObligations } from '@/features/home/api/use-obligations'
import { usePaymentsByObligation } from '@/features/home/api/use-payments-by-obligation'
import { useInsightsByObligation } from '@/features/home/api/use-insights-by-obligation'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUserState } from '@/features/auth/hooks/use-active-user'
import { deriveObligationStatus, extractOfficialBalance, makeError } from '@eltizamati/domain'
import type {
  AppError,
  Obligation,
  Payment,
  Insight,
  Id,
  ObligationKind,
  LocalDate,
} from '@eltizamati/domain'
import { calculationAsOfForObligations } from '@/services/calculation-as-of'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'
import { toErrorUiState } from '@/core/errors/error-ui-state'

const KIND_ICON: Record<ObligationKind, keyof typeof Ionicons.glyphMap> = {
  creditCard: 'card-outline',
  conventionalLoan: 'business-outline',
  murabaha: 'storefront-outline',
  genericFacility: 'briefcase-outline',
  ijara: 'key-outline',
  diminishingMusharakah: 'people-outline',
}

export default function ObligationsTab() {
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
    data,
    isLoading,
    error: obligationsErrorValue,
    refetch,
  } = useObligations(repos.obligationRepository, activeUser ?? ('' as Id<'user'>), isDemoMode)

  const {
    data: paymentsByObligation,
    isLoading: isPaymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = usePaymentsByObligation(repos.paymentRepository, data, activeUser, isDemoMode)

  const {
    data: insightsByObligation,
    isLoading: isInsightsLoading,
    error: insightsError,
    hasData: hasInsightsData,
    refetch: refetchInsights,
  } = useInsightsByObligation(repos.insightRepository, activeUser, isDemoMode)

  const obligationsError = (obligationsErrorValue as AppError | null) ?? undefined
  const activeUserError = activeUserState.status === 'error' ? activeUserState.error : undefined
  const queryError = activeUserError ?? obligationsError ?? paymentsError ?? insightsError
  const sessionRevoked = activeUserState.status === 'signedOut' || queryError?.code === 'auth'

  // Minimal filter state (future extension)
  const filter = 'all'

  const filteredData = useMemo(() => {
    if (data === undefined) return undefined
    if (filter === 'all') return data
    if (filter === 'loan') return data.filter((o) => o.kind === 'conventionalLoan')
    if (filter === 'card') return data.filter((o) => o.kind === 'creditCard')
    if (filter === 'islamic') return data.filter((o) => o.kind === 'murabaha' || o.kind === 'ijara')
    return data
  }, [data, filter])
  const asOf = calculationAsOfForObligations(isDemoMode ? 'demo' : 'personal', personalAsOf)

  const hasCompletePaymentData =
    data !== undefined && data.every((obligation) => paymentsByObligation.has(obligation.id))
  const hasRetainedData =
    data !== undefined &&
    queryError?.retryable === true &&
    queryError.code !== 'auth' &&
    (paymentsError === undefined || hasCompletePaymentData) &&
    (insightsError === undefined || hasInsightsData)

  const handleRefresh = async () => {
    setManualRefreshing(true)
    try {
      await Promise.all([refetch(), refetchPayments(), refetchInsights()])
    } finally {
      setManualRefreshing(false)
    }
  }

  useEffect(() => {
    if (sessionRevoked) router.replace('/auth/sign-in')
  }, [router, sessionRevoked])

  if (sessionRevoked) {
    return (
      <ObligationsTerminalState
        isDemoMode={isDemoMode}
        error={makeError('auth')}
        testID="obligations-session-revoked"
      />
    )
  }

  if (queryError !== undefined && !hasRetainedData) {
    return (
      <ObligationsTerminalState
        isDemoMode={isDemoMode}
        error={queryError}
        onRetry={() => {
          void handleRefresh()
        }}
        testID="obligations-query-error"
      />
    )
  }

  if (
    activeUserState.status === 'loading' ||
    isLoading ||
    isPaymentsLoading ||
    isInsightsLoading ||
    filteredData === undefined
  ) {
    return (
      <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
        <DemoBanner visible={isDemoMode} testID="obligations-demo-banner" />
        <View style={styles.loadingGroup} testID="obligations-loading">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
      <DemoBanner visible={isDemoMode} testID="obligations-demo-banner" />

      {queryError !== undefined ? (
        <ObligationsStaleDataNotice
          error={queryError}
          onRetry={() => {
            void handleRefresh()
          }}
        />
      ) : null}

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, filteredData.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            testID="obligations-refresh-control"
            onRefresh={() => {
              void handleRefresh()
            }}
            tintColor={theme.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="bodySmall" color="secondary">
              {t('obligations.obligationCount', { count: filteredData.length })}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t('obligations.emptyTitle')}
            subtitle={t('obligations.emptySubtitle')}
            testID="obligations-empty"
          />
        }
        renderItem={({ item }) => {
          const payments = paymentsByObligation.get(item.id)
          if (payments === undefined) return null
          return (
            <ObligationRow
              obligation={item}
              payments={payments}
              insights={insightsByObligation.get(item.id) ?? []}
              asOf={asOf}
              onPress={() => {
                void router.push(`/obligation/${item.id}`)
              }}
            />
          )
        }}
      />
    </SafeAreaView>
  )
}

function ObligationsTerminalState({
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
      <DemoBanner visible={isDemoMode} testID="obligations-demo-banner" />
      <ErrorState state={toErrorUiState(error)} onRetry={onRetry} testID={testID} />
    </SafeAreaView>
  )
}

function ObligationsStaleDataNotice({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  return (
    <View
      style={[styles.staleNotice, { backgroundColor: theme.cautionSoft }]}
      testID="obligations-stale-data"
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

export function ObligationRow({
  obligation,
  payments,
  insights,
  asOf,
  onPress,
}: {
  obligation: Obligation
  payments: readonly Payment[]
  insights: readonly Insight[]
  asOf: LocalDate
  onPress: () => void
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const status = deriveObligationStatus({
    obligation,
    payments,
    insights,
    today: asOf,
  })
  const balance = extractOfficialBalance(obligation)

  const leading = (
    <View style={[styles.iconBox, { backgroundColor: theme.bgSubtle }]}>
      <Ionicons name={KIND_ICON[obligation.kind]} size={20} color={theme.textSecondary} />
    </View>
  )

  const trailing = (
    <View style={styles.trailingCol}>
      {balance !== undefined && (
        <Amount
          testID="obligation-list-balance"
          variant="amountSm"
          money={balance.value}
          provenance={balance.provenance}
          precision={balance.provenance.source === 'estimate' ? 'estimate' : 'official'}
        />
      )}
      <StatusChip status={status} />
    </View>
  )

  return (
    <ListRow leading={leading} trailing={trailing} onPress={onPress}>
      <Text variant="heading" numberOfLines={2}>
        {obligation.institution.name}
      </Text>
      <Text variant="bodySmall" color="secondary">
        {t(`obligationKind.${obligation.kind}`)}
      </Text>
    </ListRow>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingGroup: {
    padding: space[4],
    gap: space[4],
  },
  list: {
    paddingBottom: space[8],
  },
  staleNotice: {
    gap: space[2],
    margin: space[3],
    padding: space[3],
    borderRadius: radius.md,
  },
  listEmpty: {
    flex: 1,
  },
  header: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailingCol: {
    alignItems: 'flex-end',
    gap: space[1],
  },
})
