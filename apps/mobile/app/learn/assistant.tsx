import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'
import { Stack } from 'expo-router'
import { Screen, Text, Card, SectionHeader, Button } from '@/core/design-system'
import { SOURCE_RECORDS } from '@/features/learn/model/catalogue-snapshot'

export default function LearnAssistantScreen() {
  const { t } = useTranslation()
  return <Screen><Stack.Screen options={{ title: t('learn.assistantTitle') }} /><Text variant="title">{t('learn.assistantTitle')}</Text><Card><Text variant="body" color="secondary">{t('learn.assistantPrivacy')}</Text></Card><Card><Text variant="body">{t('learn.assistantOffline')}</Text></Card><SectionHeader title={t('learn.sampleTitle')} /><Card><Text variant="body">{t('learn.sampleAnswer')}</Text></Card><SectionHeader title={t('learn.sources')} />{SOURCE_RECORDS.map((source) => <Card key={source.id}><Text variant="body">{source.publisherName}: {source.title}</Text><Text variant="caption" color="secondary">{source.retrievedAt} · {source.reviewStatus}</Text><Button label={t('learn.openSource')} variant="ghost" onPress={() => { void Linking.openURL(source.sourceUrl) }} /></Card>)}</Screen>
}
