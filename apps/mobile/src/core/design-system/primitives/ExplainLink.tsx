import { Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { useTheme } from '../use-theme'
import { space, minTouchTarget } from '../tokens'

export interface ExplainLinkProps {
  readonly onPress: () => void
  readonly label?: string
  readonly testID?: string
}

/**
 * ExplainLink — the shared "Explain" affordance (SCR-EXPLAIN). Replaces the
 * raw TouchableOpacity+Text pattern previously re-implemented per screen.
 * Uses the "understanding" gold role — visual-direction.md's dedicated color
 * for the moment a figure is explained, never used for warnings.
 */
export function ExplainLink({ onPress, label, testID }: ExplainLinkProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const text = label ?? t('common.explain')

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      hitSlop={8}
      style={styles.pressable}
      testID={testID}
    >
      <Ionicons name="help-circle-outline" size={16} color={theme.understanding} />
      <Text variant="bodySmall" color="understanding">
        {text}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: minTouchTarget,
  },
})
