/**
 * Obligations List Tab — Phase 5.
 *
 * Lists all obligations for the user. Uses DemoBanner.
 * Includes derived status mapping via StatusChip.
 *
 * Filters (All / Loans / Cards / Islamic) are visually present
 * but we just render "All" in Phase 5 for simplicity unless there's time.
 */

import { useMemo } from 'react'
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
} from '@/core/design-system'
import { useObligations } from '@/features/home/api/use-obligations'
import { usePaymentsByObligation } from '@/features/home/api/use-payments-by-obligation'
import { useInsightsByObligation } from '@/features/home/api/use-insights-by-obligation'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { deriveObligationStatus, extractOfficialBalance } from '@eltizamati/domain'
import type { Obligation, Payment, Insight, Id, ObligationKind } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'

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
  const activeUser = useActiveUser()

  const { data, isLoading, refetch } = useObligations(
    repos.obligationRepository,
    activeUser ?? ('' as Id<'user'>),
  )

  const { data: paymentsByObligation, isLoading: isPaymentsLoading } = usePaymentsByObligation(
    repos.paymentRepository,
    data ?? [],
  )

  const { data: insightsByObligation, isLoading: isInsightsLoading } = useInsightsByObligation(
    repos.insightRepository,
    activeUser,
  )

  // Minimal filter state (future extension)
  const filter = 'all'

  const filteredData = useMemo(() => {
    if (!data) return []
    if (filter === 'all') return data
    if (filter === 'loan') return data.filter((o) => o.kind === 'conventionalLoan')
    if (filter === 'card') return data.filter((o) => o.kind === 'creditCard')
    if (filter === 'islamic') return data.filter((o) => o.kind === 'murabaha' || o.kind === 'ijara')
    return data
  }, [data, filter])

  if (isLoading || isPaymentsLoading || isInsightsLoading || !activeUser) {
    return (
      <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
        <DemoBanner />
        <View style={styles.loadingGroup}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
      <DemoBanner />

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, filteredData.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void refetch()
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
          />
        }
        renderItem={({ item }) => (
          <ObligationRow
            obligation={item}
            payments={paymentsByObligation.get(item.id) ?? []}
            insights={insightsByObligation.get(item.id) ?? []}
            onPress={() => {
              void router.push(`/obligation/${item.id}`)
            }}
          />
        )}
      />
    </SafeAreaView>
  )
}

export function ObligationRow({
  obligation,
  payments,
  insights,
  onPress,
}: {
  obligation: Obligation
  payments: readonly Payment[]
  insights: readonly Insight[]
  onPress: () => void
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const status = deriveObligationStatus({
    obligation,
    payments,
    insights,
    today: DEMO_DATE,
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
