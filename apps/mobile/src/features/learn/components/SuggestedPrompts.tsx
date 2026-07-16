import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, useTheme, radius, space } from '@/core/design-system'

const SUGGESTION_KEYS = [
  'learn.assistantSuggestion1',
  'learn.assistantSuggestion2',
  'learn.assistantSuggestion3',
  'learn.assistantSuggestion4',
] as const

export interface SuggestedPromptsProps {
  readonly onSelect: (prompt: string) => void
}

/** Tappable example questions shown before the first message — removes the "blank page" moment. */
export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <View style={styles.group}>
      {SUGGESTION_KEYS.map((key) => {
        const prompt = t(key)
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(prompt)}
            accessibilityRole="button"
            accessibilityLabel={prompt}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.bgElevated,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text variant="bodySmall" color="primary">
              {prompt}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: space[2],
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
})
