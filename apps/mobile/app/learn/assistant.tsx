import { useState } from 'react'
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { Button, Card, Screen, SectionHeader, Text, TextField } from '@/core/design-system'
import { SOURCE_RECORDS } from '@/features/learn/model/catalogue-snapshot'
import { createLearningAssistantRequest } from '@/features/learn/model/assistant'
import { SupabaseLearningAssistantGateway } from '@/features/learn/model/supabase-learning-assistant-gateway'

type ChatMessage =
  | {
      readonly id: string
      readonly role: 'assistant'
      readonly text: string
      readonly sourceIds: readonly string[]
    }
  | {
      readonly id: string
      readonly role: 'user'
      readonly text: string
      readonly sourceIds: readonly string[]
    }

export default function LearnAssistantScreen() {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<readonly ChatMessage[]>([
    { id: 'greeting', role: 'assistant', text: t('learn.assistantGreeting'), sourceIds: [] },
  ])

  const send = async () => {
    const request = createLearningAssistantRequest({
      question: draft,
      language: i18n.language.startsWith('ar') ? 'ar' : 'en',
    })
    if (request.question.length === 0) return
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}`, role: 'user', text: request.question, sourceIds: [] },
    ])
    setDraft('')
    setIsSending(true)
    try {
      const result = await new SupabaseLearningAssistantGateway().answer(request)
      if (!result.ok) {
        setMessages((current) => [
          ...current,
          {
            id: `unavailable-${current.length}`,
            role: 'assistant',
            text: t('learn.assistantUnavailable'),
            sourceIds: [],
          },
        ])
        return
      }
      const response = result.value
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${current.length}`,
          role: 'assistant',
          text: response.answer || t('learn.assistantUnavailable'),
          sourceIds: response.sourceIds,
        },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `unavailable-${current.length}`,
          role: 'assistant',
          text: t('learn.assistantUnavailable'),
          sourceIds: [],
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('learn.assistantTitle') }} />
      <Text variant="title">{t('learn.assistantTitle')}</Text>
      <Card>
        <Text variant="bodySmall" color="secondary">
          {t('learn.assistantPrivacy')}
        </Text>
      </Card>

      {messages.map((message) => (
        <Card key={message.id}>
          <Text variant="caption" color="secondary">
            {message.role === 'assistant' ? t('learn.assistantTitle') : t('common.appName')}
          </Text>
          <Text variant="body">{message.text}</Text>
        </Card>
      ))}

      <View>
        <TextField
          label={t('learn.assistantInput')}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('learn.assistantPlaceholder')}
          testID="learn-assistant-input"
        />
        <Button
          label={t('learn.assistantSend')}
          onPress={() => {
            void send()
          }}
          disabled={draft.trim().length === 0 || isSending}
          loading={isSending}
          testID="learn-assistant-send"
        />
      </View>

      <SectionHeader title={t('learn.sources')} />
      {SOURCE_RECORDS.map((source) => (
        <Card key={source.id}>
          <Text variant="body">
            {source.publisherName}: {source.title}
          </Text>
          <Text variant="caption" color="secondary">
            {source.retrievedAt} · {source.reviewStatus}
          </Text>
          <Button
            label={t('learn.openSource')}
            variant="ghost"
            onPress={() => {
              void Linking.openURL(source.sourceUrl)
            }}
          />
        </Card>
      ))}
    </Screen>
  )
}
