import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { Text, Card, ListRow, space } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useDataStatusViewModel } from '@/features/data-status/hooks/use-data-status-view-model'

export default function DataStatusScreen() {
  return (
    <RequireRepositories>
      <DataStatusInner />
    </RequireRepositories>
  )
}

function DataStatusInner() {
  const { t } = useTranslation()
  const viewModel = useDataStatusViewModel()

  const activeLabel =
    viewModel.activeSource === 'demo-seed'
      ? t('dataStatus.providerDemoSeed')
      : t('dataStatus.providerManual')

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('dataStatus.title') }} />

      <Card>
        <View style={styles.row}>
          <Text variant="body">{activeLabel}</Text>
          <Text variant="bodySmall" color="brand">
            {t('dataStatus.statusActive')}
          </Text>
        </View>
        {viewModel.status === 'success' && (
          <>
            <ListRow>
              <Text variant="bodySmall" color="secondary">
                {t('dataStatus.obligationCount', { count: viewModel.obligationCount })}
              </Text>
            </ListRow>
            <ListRow>
              <Text variant="bodySmall" color="secondary">
                {t('dataStatus.paymentCount', { count: viewModel.paymentCount })}
              </Text>
            </ListRow>
            <ListRow>
              <Text variant="bodySmall" color="secondary">
                {viewModel.lastUpdated === undefined
                  ? t('dataStatus.lastUpdatedNone')
                  : t('dataStatus.lastUpdated', { date: viewModel.lastUpdated.substring(0, 10) })}
              </Text>
            </ListRow>
          </>
        )}
        {viewModel.status === 'loading' && (
          <Text variant="bodySmall" color="secondary">
            {t('common.loading')}
          </Text>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <Text variant="body">{t('dataStatus.providerCrif')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('dataStatus.statusNotConnected')}
          </Text>
        </View>
        <Text variant="caption" color="secondary">
          {t('dataStatus.plannedNote')}
        </Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text variant="body">{t('dataStatus.providerOpenBanking')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('dataStatus.statusNotConnected')}
          </Text>
        </View>
        <Text variant="caption" color="secondary">
          {t('dataStatus.plannedNote')}
        </Text>
      </Card>

      <Text variant="caption" color="tertiary">
        {t('dataStatus.honestyNote')}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[8],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
