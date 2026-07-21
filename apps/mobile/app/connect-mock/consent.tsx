import { useState } from 'react'
import { View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { brandId } from '@eltizamati/domain'
import { Button, Screen, Text, space } from '@/core/design-system'
import { generateUuid } from '@/core/ids/generate-uuid'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'

/**
 * Shared provider-consent gate for `/connect-mock` (legacy, retired
 * separately) and `/connect-bank` (connect-plan.md Phase E) — both need the
 * same `docType: 'provider:mock-open-banking'` acknowledgment before any
 * retrieval, so this screen takes an explicit `return` route instead of
 * hard-coding where it sends the user back.
 */
const DEFAULT_RETURN_ROUTE: Href = '/connect-mock'

/** Only known internal destinations — `return` is caller-controlled search-param input. */
const ALLOWED_RETURN_ROUTES: readonly Href[] = [DEFAULT_RETURN_ROUTE, '/connect-bank']

function resolveReturnRoute(returnTo: string | undefined): Href {
  const match = ALLOWED_RETURN_ROUTES.find((route) => route === returnTo)
  return match ?? DEFAULT_RETURN_ROUTE
}

export default function MockConsentScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const userId = useActiveUser()
  const { return: returnTo } = useLocalSearchParams<{ return?: string }>()
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
    router.replace(resolveReturnRoute(returnTo))
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
