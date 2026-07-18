import { useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { brandId } from '@eltizamati/domain'
import { Button, Screen, Text, space } from '@/core/design-system'
import { generateUuid } from '@/core/ids/generate-uuid'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'

export default function MockConsentScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const userId = useActiveUser()
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  async function consent() {
    if (!userId) return
    setSaving(true)
    const result = await repos.consentRepository.acknowledge({
      id: brandId<'consentRecord'>(generateUuid()),
      userId,
      docType: 'provider:mock-open-banking',
      version: 'v1',
      locale: i18n.language === 'ar' ? 'ar' : 'en',
      acknowledgedAt: new Date().toISOString(),
    })
    setSaving(false)
    if (!result.ok) return setError(true)
    router.replace('/connect-mock')
  }

  return (
    <Screen maxWidth="readable">
      <Stack.Screen options={{ title: t('mockConnect.consentTitle') }} />
      <View style={{ gap: space[4] }}>
        <Text variant="title">{t('mockConnect.consentTitle')}</Text>
        <Text>{t('mockConnect.mockDisclosure')}</Text>
        <Text color="secondary">{t('mockConnect.consentBody')}</Text>
        {error && <Text color="critical">{t('mockConnect.consentError')}</Text>}
        <Button
          label={t('mockConnect.consentAction')}
          onPress={() => void consent()}
          loading={saving}
        />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}
