import { useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Text, space, InsightBanner, SectionHeader, Button } from '@/core/design-system'
import { useInsightsViewModel } from '@/features/insights/hooks/use-insights-view-model'
import { useObligations } from '@/features/home/api/use-obligations'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { insightKeys } from '@/features/home/api/keys'
import type { Id, Insight } from '@eltizamati/domain'
import { toBannerSeverity } from '@/features/insights/severity'

export default function InsightsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const queryClient = useQueryClient()
  const viewModel = useInsightsViewModel()
  const { data: obligations } = useObligations(
    repos.obligationRepository,
    activeUser ?? ('' as Id<'user'>),
  )
  const [expandedId, setExpandedId] = useState<string | undefined>(undefined)

  const nicknameFor = (obligationId: Id<'obligation'> | undefined): string | undefined =>
    obligations?.find((o) => o.id === obligationId)?.nickname

  async function handleView(insight: Insight) {
    if (activeUser && insight.readAt === undefined) {
      const result = await repos.insightRepository.markRead(insight.id)
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: insightKeys.list(activeUser) })
      }
    }
    if (insight.obligationId !== undefined) {
      const isRateImpactInsight = [
        'RATE_INCREASED',
        'INSTALLMENT_UNCHANGED_AFTER_INCREASE',
        'RESIDUAL_RISK',
      ].includes(insight.ruleId)
      router.push(
        isRateImpactInsight
          ? `/obligation/${insight.obligationId}/rate-impact`
          : `/obligation/${insight.obligationId}`,
      )
    }
  }

  async function handleWhy(insight: Insight) {
    if (activeUser && insight.readAt === undefined) {
      const result = await repos.insightRepository.markRead(insight.id)
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: insightKeys.list(activeUser) })
      }
    }
    setExpandedId(expandedId === insight.id ? undefined : insight.id)
  }

  // Group by obligation so judges/users see insights in the context of the loan they're about.
  const groups = new Map<string, Insight[]>()
  if (viewModel.status === 'success') {
    for (const insight of viewModel.insights) {
      const key = insight.obligationId ?? 'general'
      const existing = groups.get(key)
      if (existing) existing.push(insight)
      else groups.set(key, [insight])
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('insights.title') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
        {viewModel.status === 'error' && (
          <Text variant="body" color="critical">
            {t('insights.error')}
          </Text>
        )}

        {viewModel.status === 'success' && viewModel.insights.length === 0 && (
          <View style={styles.empty}>
            <Text variant="body" color="secondary" align="center">
              {t('insights.empty')}
            </Text>
          </View>
        )}

        {viewModel.status === 'success' &&
          [...groups.entries()].map(([groupKey, groupInsights]) => (
            <View key={groupKey} style={styles.group}>
              <SectionHeader
                title={
                  groupKey === 'general'
                    ? t('insights.generalGroup', 'General')
                    : (nicknameFor(groupInsights[0]?.obligationId) ??
                      t('insights.generalGroup', 'General'))
                }
              />
              {groupInsights.map((insight) => (
                <InsightBanner
                  key={insight.id}
                  title={t(insight.titleKey, insight.params)}
                  body={t(insight.bodyKey, insight.params)}
                  severity={toBannerSeverity(insight.severity)}
                  unread={insight.readAt === undefined}
                  action={
                    <View style={styles.actions}>
                      <View style={styles.actionsRow}>
                        {insight.obligationId !== undefined && (
                          <Button
                            label={t('insights.viewObligation', 'View obligation')}
                            variant="ghost"
                            onPress={() => {
                              void handleView(insight)
                            }}
                            testID={`insight-view-${insight.id}`}
                          />
                        )}
                        <Pressable
                          onPress={() => void handleWhy(insight)}
                          accessibilityRole="button"
                          accessibilityLabel={t('insights.whyLabel', 'Why did I get this?')}
                          testID={`insight-why-${insight.id}`}
                          hitSlop={8}
                        >
                          <Text variant="bodySmall" color="secondary">
                            {t('insights.whyLabel', 'Why did I get this?')}
                          </Text>
                        </Pressable>
                      </View>
                      {expandedId === insight.id && (
                        <Text variant="bodySmall" color="secondary">
                          {t(insight.bodyKey, insight.params)}
                        </Text>
                      )}
                    </View>
                  }
                />
              ))}
            </View>
          ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
  },
  empty: {
    marginTop: space[8],
  },
  group: {
    marginBottom: space[4],
  },
  actions: {
    gap: space[2],
    alignItems: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
})
