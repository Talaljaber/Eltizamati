import { useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, Text, space } from '@/core/design-system'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { MockConnectService } from '@/services/mock-connect-service'

const service = new MockConnectService()

export default function MockConnectScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const userId = useActiveUser()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [obligationId, setObligationId] = useState<string>()

  async function connect() {
    if (!userId) return
    const consents = await repos.consentRepository.status(userId)
    const consented =
      consents.ok &&
      consents.value.some(
        (record) => record.docType === 'provider:mock-open-banking' && record.version === 'v1',
      )
    if (!consented) return router.replace('/connect-mock/consent')
    setStatus('loading')
    const result = await service.retrieveAndImport(userId, repos)
    if (!result.ok) return setStatus('error')
    setObligationId(result.value.obligationId)
    setStatus('success')
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('mockConnect.title') }} />
      <View style={{ gap: space[4] }}>
        <Card>
          <Text variant="heading">{t('mockConnect.providerName')}</Text>
          <Text color="critical">{t('mockConnect.mockBadge')}</Text>
          <Text color="secondary">{t('mockConnect.mockDisclosure')}</Text>
        </Card>
        {status === 'error' && <Text color="critical">{t('mockConnect.error')}</Text>}
        {status === 'success' && <Text color="positive">{t('mockConnect.success')}</Text>}
        <Button
          label={status === 'error' ? t('common.retry') : t('mockConnect.connect')}
          onPress={() => void connect()}
          loading={status === 'loading'}
        />
        {status === 'success' && obligationId !== undefined && (
          <Button
            label={t('mockConnect.viewImported')}
            variant="secondary"
            onPress={() => router.replace(`/obligation/${obligationId}`)}
          />
        )}
      </View>
    </Screen>
  )
}
