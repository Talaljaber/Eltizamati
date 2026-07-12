import { View, StyleSheet, ScrollView } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, InsightBanner } from '@/core/design-system'
import { useInsightsViewModel } from '@/features/insights/hooks/use-insights-view-model'
import type { InsightSeverity } from '@eltizamati/domain'

/** InsightSeverity (domain) has no direct 'calm' bucket — info/positive both read as calm in the banner. */
function toBannerSeverity(severity: InsightSeverity): 'urgent' | 'attention' | 'calm' {
  if (severity === 'urgent') return 'urgent'
  if (severity === 'attention') return 'attention'
  return 'calm'
}

export default function InsightsScreen() {
  const { t } = useTranslation()
  const viewModel = useInsightsViewModel()

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
          viewModel.insights.map((insight) => (
            <InsightBanner
              key={insight.id}
              title={t(insight.titleKey)}
              body={t(insight.bodyKey, insight.params)}
              severity={toBannerSeverity(insight.severity)}
            />
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
})
