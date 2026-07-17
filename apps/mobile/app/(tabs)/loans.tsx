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
  useTheme,
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
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, data.length === 0 && styles.listEmpty]}
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
        renderItem={({ item }) => <ApplicationRow application={item} />}
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
  listEmpty: { flex: 1 },
})
