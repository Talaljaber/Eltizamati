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
import {
  Text,
  space,
  useTheme,
  DemoBanner,
  SkeletonCard,
  ListRow,
  StatusChip,
  EmptyState,
} from '@/core/design-system'
import { useObligations } from '@/features/home/api/use-obligations'
import { useDemoRepositories } from '@/features/demo/hooks/use-demo-repositories'
import { deriveObligationStatus } from '@eltizamati/domain'
import type { Obligation, Id } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'

export default function ObligationsTab() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const repos = useDemoRepositories()

  const userId = 'user-1' as Id<'user'>

  const { data, isLoading, refetch } = useObligations(repos.obligationRepository, userId)

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

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.bg }]}>
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
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.bg }]}>
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
            onPress={() => {
              void router.push(`/obligation/${item.id}`)
            }}
          />
        )}
      />
    </SafeAreaView>
  )
}

function ObligationRow({ obligation, onPress }: { obligation: Obligation; onPress: () => void }) {
  const { t } = useTranslation()
  const status = deriveObligationStatus({
    obligation,
    payments: [],
    insights: [],
    today: DEMO_DATE,
  })

  const leading = (
    <View style={styles.iconBox}>
      <Text variant="heading">
        {obligation.kind === 'creditCard'
          ? '💳'
          : obligation.kind === 'conventionalLoan'
            ? '🏦'
            : '🤝'}
      </Text>
    </View>
  )

  const trailing = (
    <View style={styles.trailingCol}>
      <StatusChip status={status} />
    </View>
  )

  return (
    <ListRow leading={leading} trailing={trailing} onPress={onPress}>
      <Text variant="heading" numberOfLines={1}>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailingCol: {
    alignItems: 'flex-end',
  },
})
