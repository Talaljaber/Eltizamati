import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, useTheme, radius, space } from '@/core/design-system'
import type { SourceRecord } from '../model/catalogue'
import type { LearningAssistantResponse } from '../model/assistant'

export interface ChatBubbleProps {
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly sources?: readonly SourceRecord[]
  /** Present only for assistant messages that carried a structured response. */
  readonly assumptions?: readonly string[]
  readonly unknowns?: readonly string[]
  readonly questionsToAskTheBank?: readonly string[]
  readonly disclaimer?: string
  readonly status?: LearningAssistantResponse['status']
}

/**
 * One chat message bubble. The "tail" corner (the corner nearest the sender)
 * uses a tighter radius than the other three — a direction-aware detail via
 * RN's logical `border*Start/EndRadius` props, which flip correctly under RTL
 * without any manual left/right branching.
 *
 * Assistant messages may also carry the structured-response fields the
 * `learn-assistant` function returns (assumptions, unknowns, questions to
 * ask the bank, and a disclaimer) — these are the response's core trust
 * mechanic and are rendered below the answer, never silently dropped.
 */
export function ChatBubble({
  role,
  text,
  sources,
  assumptions,
  unknowns,
  questionsToAskTheBank,
  disclaimer,
  status,
}: ChatBubbleProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isUser = role === 'user'
  const isInsufficient = status === 'insufficient-verified-data'

  return (
    <View style={[styles.row, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? theme.brand : theme.bgElevated,
            borderColor: isUser ? 'transparent' : theme.border,
            borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
          },
          isUser ? { borderBottomEndRadius: radius.sm } : { borderBottomStartRadius: radius.sm },
        ]}
      >
        {isInsufficient ? (
          <Text variant="caption" color="estimate">
            {t('learn.insufficientDataTitle')}
          </Text>
        ) : null}
        <Text variant="body" color={isUser ? 'onBrand' : 'primary'}>
          {text}
        </Text>
      </View>

      {!isUser && assumptions !== undefined && assumptions.length > 0 ? (
        <View style={styles.structuredGroup}>
          <Text variant="caption" color="tertiary">
            {t('learn.assumptionsTitle')}
          </Text>
          {assumptions.map((item, index) => (
            <Text key={index} variant="bodySmall" color="secondary">
              {'•'} {item}
            </Text>
          ))}
        </View>
      ) : null}

      {!isUser && unknowns !== undefined && unknowns.length > 0 ? (
        <View style={styles.structuredGroup}>
          <Text variant="caption" color="tertiary">
            {t('learn.unknownsTitle')}
          </Text>
          {unknowns.map((item, index) => (
            <Text key={index} variant="bodySmall" color="secondary">
              {'•'} {item}
            </Text>
          ))}
        </View>
      ) : null}

      {!isUser && questionsToAskTheBank !== undefined && questionsToAskTheBank.length > 0 ? (
        <View style={styles.structuredGroup}>
          <Text variant="caption" color="tertiary">
            {t('learn.questionsToAskTitle')}
          </Text>
          {questionsToAskTheBank.map((item, index) => (
            <Text key={index} variant="bodySmall" color="secondary">
              {index + 1}. {item}
            </Text>
          ))}
        </View>
      ) : null}

      {!isUser && sources !== undefined && sources.length > 0 ? (
        <View style={styles.sourceRow}>
          <Text variant="caption" color="tertiary">
            {t('learn.assistantSources')}
          </Text>
          <View style={styles.chipRow}>
            {sources.map((source) => (
              <Pressable
                key={source.id}
                onPress={() => void Linking.openURL(source.sourceUrl)}
                accessibilityRole="link"
                accessibilityLabel={`${t('learn.openSource')}: ${source.publisherName}`}
                style={[styles.chip, { backgroundColor: theme.brandSoft }]}
              >
                <Text variant="caption" color="brand">
                  {source.publisherName}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {!isUser && disclaimer !== undefined && disclaimer.length > 0 ? (
        <View style={[styles.disclaimer, { backgroundColor: theme.estimateSurface }]}>
          <Text variant="caption" color="estimate">
            {disclaimer}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: space[1],
  },
  bubble: {
    maxWidth: '84%',
    gap: space[1],
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  structuredGroup: {
    maxWidth: '84%',
    gap: space[1],
  },
  sourceRow: {
    gap: space[1],
    maxWidth: '84%',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[1],
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  disclaimer: {
    maxWidth: '84%',
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
})
