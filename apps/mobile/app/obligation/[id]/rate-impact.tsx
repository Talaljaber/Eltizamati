import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, Card, FieldRow } from '@/core/design-system'
import { useRateImpactViewModel } from '@/features/rate-impact/hooks/use-rate-impact-view-model'
import type { Id } from '@eltizamati/domain'

export default function RateImpactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useRateImpactViewModel(id as Id<'obligation'>)

  return (
    <>
      <Stack.Screen options={{ title: t('rateImpact.title', 'Rate Impact') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.status === 'loading' && <Text variant="body">{t('common.loading')}</Text>}
        {viewModel.status === 'error' && <Text variant="body" color="critical">{t('rateImpact.error')}</Text>}
        {viewModel.status === 'unsupported' && <Text variant="body" color="secondary">{t('rateImpact.unsupported')}</Text>}
        {viewModel.status === 'refused' && <Text variant="body" color="critical">{t('error.calculationRefused')}</Text>}

        {viewModel.status === 'success' && (
          <Card>
            <View style={styles.sectionTitle}>
              <Text variant="heading">{t('rateImpact.summary')}</Text>
            </View>

            <FieldRow
              label={t('rateImpact.hasResidual')}
              value={viewModel.hasResidual ? t('common.yes') : t('common.no')}
              valueColor={viewModel.hasResidual ? 'critical' : 'positive'}
            />

            <FieldRow
              label={t('rateImpact.addedCost')}
              value={viewModel.addedCostAvailable ? '' : t('rateImpact.addedCostPending')}
              valueColor="secondary"
            />
          </Card>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
  },
  sectionTitle: {
    marginBottom: space[4],
  },
})
