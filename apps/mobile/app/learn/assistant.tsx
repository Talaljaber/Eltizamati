import { useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { Text, useTheme, space } from '@/core/design-system'
import { SOURCE_RECORDS } from '@/features/learn/model/catalogue-snapshot'
import type { SourceRecord } from '@/features/learn/model/catalogue'
import { createLearningAssistantRequest } from '@/features/learn/model/assistant'
import { SupabaseLearningAssistantGateway } from '@/features/learn/model/supabase-learning-assistant-gateway'
import { ChatBubble } from '@/features/learn/components/ChatBubble'
import { ChatComposer } from '@/features/learn/components/ChatComposer'
import { TypingIndicator } from '@/features/learn/components/TypingIndicator'
import { SuggestedPrompts } from '@/features/learn/components/SuggestedPrompts'

interface ChatMessage {
  readonly id: string
  readonly role: 'assistant' | 'user'
  readonly text: string
  readonly sourceIds: readonly string[]
}

const SOURCES_BY_ID = new Map<string, SourceRecord>(SOURCE_RECORDS.map((s) => [s.id, s]))

export default function LearnAssistantScreen() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<readonly ChatMessage[]>([])
  const listRef = useRef<FlatList<ChatMessage>>(null)

  function scrollToEnd() {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
  }

  const send = async (question: string) => {
    const request = createLearningAssistantRequest({
      question,
      language: i18n.language.startsWith('ar') ? 'ar' : 'en',
    })
    if (request.question.length === 0) return
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}`, role: 'user', text: request.question, sourceIds: [] },
    ])
    setDraft('')
    setIsSending(true)
    scrollToEnd()
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
      scrollToEnd()
    }
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ title: t('learn.assistantTitle') }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          ListHeaderComponent={
            <View style={styles.privacy}>
              <Text variant="caption" color="tertiary">
                {t('learn.assistantPrivacy')}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title">{t('learn.assistantEmptyTitle')}</Text>
              <Text variant="body" color="secondary">
                {t('learn.assistantGreeting')}
              </Text>
              <SuggestedPrompts onSelect={(prompt) => void send(prompt)} />
            </View>
          }
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              text={item.text}
              sources={item.sourceIds
                .map((id) => SOURCES_BY_ID.get(id))
                .filter((source): source is SourceRecord => source !== undefined)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            isSending ? (
              <View style={styles.typingFooter}>
                <TypingIndicator />
              </View>
            ) : null
          }
        />
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={() => void send(draft)}
          sending={isSending}
          testID="learn-assistant-input"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[4],
  },
  privacy: {
    marginBottom: space[3],
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    gap: space[3],
  },
  separator: {
    height: space[3],
  },
  typingFooter: {
    marginTop: space[3],
  },
})
