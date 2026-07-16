import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, useTheme, radius, space } from '@/core/design-system'
import type { SourceRecord } from '../model/catalogue'

export interface ChatBubbleProps {
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly sources?: readonly SourceRecord[]
}

/**
 * One chat message bubble. The "tail" corner (the corner nearest the sender)
 * uses a tighter radius than the other three — a direction-aware detail via
 * RN's logical `border*Start/EndRadius` props, which flip correctly under RTL
 * without any manual left/right branching.
 */
export function ChatBubble({ role, text, sources }: ChatBubbleProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isUser = role === 'user'

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
          isUser
            ? { borderBottomEndRadius: radius.sm }
            : { borderBottomStartRadius: radius.sm },
        ]}
      >
        <Text variant="body" color={isUser ? 'onBrand' : 'primary'}>
          {text}
        </Text>
      </View>
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
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: space[1],
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
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
})
