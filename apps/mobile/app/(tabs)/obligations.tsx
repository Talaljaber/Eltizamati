/**
 * Obligations List Tab.
 *
 * Lists all obligations for the user, filterable by product family
 * (All / Loans / Cards / Islamic). Uses DemoBanner.
 * Includes derived status mapping via StatusChip.
 */

type ObligationFilter = 'all' | 'loan' | 'card' | 'islamic'

import { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  Text,
  space,
  radius,
  minTouchTarget,
  useTheme,
  useResponsiveLayout,
  layout,
  PageContent,
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
  const { isWideWeb, width } = useResponsiveLayout()
  const columns = isWideWeb ? Math.max(1, Math.floor(width / 420)) : 1

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

  const [filter, setFilter] = useState<ObligationFilter>('all')

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
        <PageContent maxWidth="content">
          <ObligationsStaleDataNotice
            error={queryError}
            onRetry={() => {
              void handleRefresh()
            }}
          />
        </PageContent>
      ) : null}

      <FlatList
        key={columns}
        data={filteredData}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          filteredData.length === 0 && styles.listEmpty,
          isWideWeb && styles.listWide,
        ]}
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
            <ObligationFilterRow value={filter} onChange={setFilter} />
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
          const row = (
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
          if (columns <= 1) return row
          return (
            <View
              style={[styles.gridCell, { borderColor: theme.border, backgroundColor: theme.bg }]}
            >
              {row}
            </View>
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

const FILTER_LABEL_KEY: Record<ObligationFilter, string> = {
  all: 'obligations.filterAll',
  loan: 'obligations.filterLoan',
  card: 'obligations.filterCard',
  islamic: 'obligations.filterIslamic',
}

function ObligationFilterRow({
  value,
  onChange,
}: {
  value: ObligationFilter
  onChange: (filter: ObligationFilter) => void
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const filters: readonly ObligationFilter[] = ['all', 'loan', 'card', 'islamic']

  return (
    <View style={styles.filterRow} testID="obligations-filter-row">
      {filters.map((filterValue) => {
        const selected = filterValue === value
        const label = t(FILTER_LABEL_KEY[filterValue])
        return (
          <Pressable
            key={filterValue}
            onPress={() => onChange(filterValue)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            testID={`obligations-filter-${filterValue}`}
            style={[
              styles.filterChip,
              { backgroundColor: selected ? theme.brand : theme.bgSubtle },
            ]}
          >
            <Text variant="bodySmall" color={selected ? 'onBrand' : 'secondary'}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
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
  listWide: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: space[7],
  },
  gridRow: {
    gap: space[3],
  },
  gridCell: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    marginBottom: space[3],
    overflow: 'hidden',
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
    gap: space[3],
  },
  filterRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  filterChip: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: space[3],
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
