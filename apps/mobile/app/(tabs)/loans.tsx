/**
 * Loan Applications Tab — lists the user's own loan applications and their
 * status (pending / approved / rejected), newest first. The "+" header
 * action opens the apply form (/loan-application/apply). Approval/rejection
 * happens on the admin dashboard; this screen only reads.
 */
import { useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  space,
  radius,
  useTheme,
  useResponsiveLayout,
  layout,
  DemoBanner,
  SkeletonCard,
  EmptyState,
  ErrorState,
  ListRow,
} from '@/core/design-system'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUserState } from '@/features/auth/hooks/use-active-user'
import { useLoanApplications } from '@/features/loan-application/api/use-loan-applications'
import { ApplicationStatusBadge } from '@/features/loan-application/components/ApplicationStatusBadge'
import { toErrorUiState } from '@/core/errors/error-ui-state'
import type { AppError, Id, LoanApplication } from '@eltizamati/domain'

export default function LoansTab() {
  const { t } = useTranslation()
  const theme = useTheme()
  const repos = useRepositories()
  const activeUserState = useActiveUserState()
  const isDemoMode = activeUserState.status === 'demo'
  const activeUser = activeUserState.userId
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const { isWideWeb, width } = useResponsiveLayout()
  const columns = isWideWeb ? Math.max(1, Math.floor(width / 420)) : 1

  const { data, isLoading, error, refetch } = useLoanApplications(
    repos.loanApplicationRepository,
    activeUser ?? ('' as Id<'user'>),
    isDemoMode,
  )

  const queryError = (error as AppError | null) ?? undefined

  async function handleRefresh() {
    setManualRefreshing(true)
    try {
      await refetch()
    } finally {
      setManualRefreshing(false)
    }
  }

  if (queryError !== undefined && data === undefined) {
    return (
      <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
        <DemoBanner visible={isDemoMode} testID="loans-demo-banner" />
        <ErrorState
          state={toErrorUiState(queryError)}
          onRetry={() => void handleRefresh()}
          testID="loans-query-error"
        />
      </SafeAreaView>
    )
  }

  if (activeUserState.status === 'loading' || isLoading || data === undefined) {
    return (
      <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
        <DemoBanner visible={isDemoMode} testID="loans-demo-banner" />
        <View style={styles.loadingGroup} testID="loans-loading">
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.bg }]}>
      <DemoBanner visible={isDemoMode} testID="loans-demo-banner" />
      <FlatList
        key={columns}
        data={data}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          data.length === 0 && styles.listEmpty,
          isWideWeb && styles.listWide,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            testID="loans-refresh-control"
            onRefresh={() => void handleRefresh()}
            tintColor={theme.brand}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={t('loanApplication.emptyTitle')}
            subtitle={t('loanApplication.emptySubtitle')}
            testID="loans-empty"
          />
        }
        renderItem={({ item }) => {
          const row = <ApplicationRow application={item} />
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

function ApplicationRow({ application }: { application: LoanApplication }) {
  const { t } = useTranslation()

  const detail =
    application.status === 'approved' && application.approvedAmount !== undefined
      ? t('loanApplication.approvedTerms', {
          amount: application.approvedAmount,
          months: application.approvedTermMonths ?? application.requestedTermMonths,
        })
      : t('loanApplication.requested', {
          amount: application.requestedAmount,
          months: application.requestedTermMonths,
        })

  return (
    <ListRow trailing={<ApplicationStatusBadge status={application.status} />}>
      <Text variant="heading" numberOfLines={1}>
        {application.institutionName}
      </Text>
      <Text variant="bodySmall" color="secondary">
        {t(`loanApplication.purpose${capitalize(application.purpose)}`)} · {detail}
      </Text>
      {application.status === 'rejected' && application.decisionReason !== undefined ? (
        <Text variant="bodySmall" color="critical">
          {t('loanApplication.rejectionReason', { reason: application.decisionReason })}
        </Text>
      ) : null}
    </ListRow>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingGroup: { padding: space[4], gap: space[4] },
  list: { paddingBottom: space[8] },
  listWide: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: space[7],
  },
  listEmpty: { flex: 1 },
  gridRow: { gap: space[3] },
  gridCell: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    marginBottom: space[3],
    overflow: 'hidden',
  },
})
