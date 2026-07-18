import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  Text,
  Card,
  ListRow,
  EmptyState,
  space,
  layout,
  useResponsiveLayout,
} from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'

export default function AcknowledgmentsScreen() {
  return (
    <RequireRepositories>
      <AcknowledgmentsInner />
    </RequireRepositories>
  )
}

function AcknowledgmentsInner() {
  const { t } = useTranslation()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const { isWideWeb } = useResponsiveLayout()

  const { data: records, isLoading } = useQuery({
    queryKey: ['consentRecords', activeUser],
    queryFn: async () => {
      if (!activeUser) return []
      const res = await repos.consentRepository.status(activeUser)
      if (!res.ok) throw res.error
      return res.value
    },
    enabled: !!activeUser,
  })

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isWideWeb && styles.scrollWide]}>
      <Stack.Screen options={{ title: t('settings.acknowledgmentsTitle') }} />
      {isLoading ? (
        <Text variant="body">{t('common.loading')}</Text>
      ) : !records || records.length === 0 ? (
        <EmptyState
          title={t('settings.acknowledgmentsEmptyTitle')}
          subtitle={t('settings.acknowledgmentsEmptySubtitle')}
        />
      ) : (
        <Card>
          {records.map((record) => (
            <ListRow key={record.id}>
              <Text variant="body">
                {t(`settings.acknowledgmentDoc.${record.docType}`, record.docType)}
              </Text>
              <View style={styles.metaRow}>
                <Text variant="bodySmall" color="secondary">
                  {t('settings.acknowledgedVersion', { version: record.version })}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {record.acknowledgedAt.substring(0, 10)}
                </Text>
              </View>
            </ListRow>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[8],
  },
  scrollWide: {
    width: '100%',
    maxWidth: layout.readableMaxWidth,
    alignSelf: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[1],
  },
})
