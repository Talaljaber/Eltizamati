import type { ReactNode } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import { useTheme } from '../use-theme'
import { space, minTouchTarget } from '../tokens'

export interface ListRowProps {
  /** Left/leading content — icon, avatar, or chip. */
  readonly leading?: ReactNode
  /** Main content — Text components only (no raw strings). */
  readonly children: ReactNode
  /** Right/trailing content — Amount, badge, or chevron. */
  readonly trailing?: ReactNode
  /** If provided, row is pressable with ripple feedback. */
  readonly onPress?: () => void
  readonly accessibilityLabel?: string
  readonly testID?: string
}

/**
 * ListRow — a single row in a list, direction-aware (RTL-safe leading/trailing).
 * Always achieves minimum touch target when pressable (a11y, design-system.md §5).
 */
export function ListRow({
  leading,
  children,
  trailing,
  onPress,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const theme = useTheme()

  const inner = (
    <View style={styles.inner}>
      {leading !== undefined && leading !== null ? (
        <View style={styles.leading}>{leading}</View>
      ) : null}
      <View style={styles.content}>{children}</View>
      {trailing !== undefined && trailing !== null ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : null}
    </View>
  )

  if (!onPress)
    return (
      <View style={[styles.row, { borderBottomColor: theme.border }]} testID={testID}>
        {inner}
      </View>
    )

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, backgroundColor: pressed ? theme.bgSubtle : undefined },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}
    >
      {inner}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: minTouchTarget,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    gap: space[3],
  },
  leading: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: space[1],
  },
  trailing: {
    flexShrink: 0,
  },
})
