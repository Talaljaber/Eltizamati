import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { Screen, Text, Card, Button, SectionHeader } from '@/core/design-system'
import { FINANCING_PRODUCTS } from '@/features/learn/model/catalogue-snapshot'
import { comparePublishedProducts } from '@/features/learn/model/comparison-service'

export default function LearnCompareScreen() {
  const { t } = useTranslation()
  const [purpose, setPurpose] = useState<'housing' | 'personal'>('housing')
  const results = comparePublishedProducts(FINANCING_PRODUCTS, { purpose, structurePreference: 'either', salaryTransferPreference: 'no-preference', priorities: ['clearer-published-terms'] })
  return <Screen><Stack.Screen options={{ title: t('learn.compareTitle') }} /><Text variant="title">{t('learn.compareTitle')}</Text><Text variant="body" color="secondary">{t('learn.compareIntro')}</Text>
    <Button label={t('learn.purposeHousing')} onPress={() => setPurpose('housing')} variant={purpose === 'housing' ? 'primary' : 'secondary'} />
    <Button label={t('learn.purposePersonal')} onPress={() => setPurpose('personal')} variant={purpose === 'personal' ? 'primary' : 'secondary'} />
    <SectionHeader title={t('learn.showMatches')} />
    {results.length === 0 ? <Text variant="body">{t('learn.noMatches')}</Text> : results.map((result) => <Card key={result.product.id}><Text variant="heading">{result.product.nameEn}</Text><Text variant="bodySmall" color="secondary">{result.product.pricing.kind} · {result.product.completeness}</Text>{result.unknowns.length > 0 && <Text variant="caption" color="secondary">{t('learn.partial')}</Text>}<Text variant="caption" color="secondary">{t('learn.confirm')}</Text></Card>)}
  </Screen>
}
