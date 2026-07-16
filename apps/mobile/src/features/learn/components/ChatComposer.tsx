import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { minTouchTarget, radius, space, useTheme } from '@/core/design-system'

export interface ChatComposerProps {
  readonly value: string
  readonly onChangeText: (value: string) => void
  readonly onSend: () => void
  readonly sending: boolean
  readonly testID?: string
}

/** Rounded pill input + circular send button — the whole composer, one row. */
export function ChatComposer({ value, onChangeText, onSend, sending, testID }: ChatComposerProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const canSend = value.trim().length > 0 && !sending

  return (
    <View style={[styles.row, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('learn.assistantPlaceholder')}
        placeholderTextColor={theme.textTertiary}
        multiline
        maxLength={2000}
        accessibilityLabel={t('learn.assistantInput')}
        testID={testID}
        style={[
          styles.input,
          { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary },
        ]}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={t('learn.assistantSend')}
        accessibilityState={{ disabled: !canSend, busy: sending }}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: theme.brand,
            opacity: !canSend ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color={theme.textOnBrand} size="small" />
        ) : (
          <Ionicons name="arrow-up" size={20} color={theme.textOnBrand} />
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: minTouchTarget,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: 16,
  },
  sendButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
