/**
 * Obligation Detail Screen (Minimal) — Phase 5.
 *
 * Shows read-only overview of a single obligation.
 * Displays provenance badges, status, and raw entity fields.
 * Includes DemoBanner.
 */

import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  space,
  useTheme,
  DemoBanner,
  SkeletonCard,
  StatusChip,
  ProvenanceBadge,
  EmptyState,
  radius,
} from '@/core/design-system'
import { useObligation } from '@/features/obligations/api/use-obligation'
import { useDemoRepositories } from '@/features/demo/hooks/use-demo-repositories'
import { RequireDemoRepositories } from '@/features/demo/components/RequireDemoRepositories'
import { deriveObligationStatus } from '@eltizamati/domain'
import type { Id } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'

export default function ObligationDetailScreen() {
  return (
    <RequireDemoRepositories>
      <ObligationDetailInner />
    </RequireDemoRepositories>
  )
}

function ObligationDetailInner() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const repos = useDemoRepositories()

  const {
    data: obligation,
    isLoading,
    isError,
  } = useObligation(repos.obligationRepository, id as Id<'obligation'>)

  if (isError) {
    return (
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.root, { backgroundColor: theme.bg }]}
      >
        <DemoBanner />
        <EmptyState
          title={t('obligationDetail.notFoundTitle')}
          subtitle={t('obligationDetail.notFoundSubtitle')}
        />
      </SafeAreaView>
    )
  }

  if (isLoading || !obligation) {
    return (
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.root, { backgroundColor: theme.bg }]}
      >
        <DemoBanner />
        <View style={styles.loadingGroup}>
          <SkeletonCard />
        </View>
      </SafeAreaView>
    )
  }

  const status = deriveObligationStatus({
    obligation,
    payments: [],
    insights: [],
    today: DEMO_DATE,
  })

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.root, { backgroundColor: theme.bg }]}
    >
      <DemoBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="display">
            {obligation.kind === 'creditCard'
              ? '💳'
              : obligation.kind === 'conventionalLoan'
                ? '🏦'
                : '🤝'}
          </Text>
          <Text variant="title">{obligation.institution.name}</Text>
          <View style={styles.badges}>
            <StatusChip status={status} />
            <ProvenanceBadge source={obligation.provenance.source} />
          </View>
        </View>

        <View
          style={[styles.section, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
        >
          <DetailRow
            label={t('obligationDetail.kind')}
            value={t(`obligationKind.${obligation.kind}`)}
            theme={theme}
          />
          <DetailRow
            label={t('obligationDetail.opened')}
            value={obligation.openedDate}
            theme={theme}
          />
          <DetailRow
            label={t('obligationDetail.currency')}
            value={obligation.currency}
            theme={theme}
          />
        </View>

        {obligation.kind === 'conventionalLoan' && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.bgElevated, borderColor: theme.border },
            ]}
          >
            <Text variant="heading">{t('obligationDetail.loanSection')}</Text>
            <DetailRow
              label={t('obligationDetail.originalPrincipal')}
              value={obligation.loanDetails.originalPrincipal.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.installment')}
              value={obligation.loanDetails.installment.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.term')}
              value={t('obligationDetail.termMonths', {
                months: obligation.loanDetails.termMonths,
              })}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.startDate')}
              value={obligation.loanDetails.startDate}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.rateType')}
              value={
                obligation.loanDetails.rateType === 'fixed'
                  ? t('obligationDetail.rateTypeFixed')
                  : t('obligationDetail.rateTypeVariable')
              }
              theme={theme}
            />
          </View>
        )}

        {obligation.kind === 'murabaha' && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.bgElevated, borderColor: theme.border },
            ]}
          >
            <Text variant="heading">{t('obligationDetail.murabahaSection')}</Text>
            <DetailRow
              label={t('obligationDetail.assetCost')}
              value={obligation.murabahaDetails.assetCost.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.disclosedProfit')}
              value={obligation.murabahaDetails.disclosedProfit.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.totalSalePrice')}
              value={obligation.murabahaDetails.totalSalePrice.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.installment')}
              value={obligation.murabahaDetails.installment.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.term')}
              value={t('obligationDetail.termMonths', {
                months: obligation.murabahaDetails.termMonths.value,
              })}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.startDate')}
              value={obligation.murabahaDetails.startDate}
              theme={theme}
            />
          </View>
        )}

        {obligation.kind === 'creditCard' && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.bgElevated, borderColor: theme.border },
            ]}
          >
            <Text variant="heading">{t('obligationDetail.cardSection')}</Text>
            <DetailRow
              label={t('obligationDetail.creditLimit')}
              value={obligation.cardDetails.creditLimit.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.currentBalance')}
              value={obligation.cardDetails.currentBalance.value.toStorageString()}
              theme={theme}
            />
            <DetailRow
              label={t('obligationDetail.dueDate')}
              value={obligation.cardDetails.dueDate ?? 'N/A'}
              theme={theme}
            />
          </View>
        )}

        <View style={styles.footerNote}>
          <Text variant="bodySmall" color="secondary" align="center">
            {t('obligationDetail.phaseNote')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function DetailRow({
  label,
  value,
  theme,
}: {
  label: string
  value: string
  theme: ReturnType<typeof useTheme>
}) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text variant="body" color="secondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  badges: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  section: {
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space[3],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footerNote: {
    paddingVertical: space[4],
  },
})
