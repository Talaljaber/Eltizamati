import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { radius, space } from '../tokens'
import { resolveElevation } from '../use-elevation'
import { useTheme } from '../use-theme'

export interface CardProps {
  readonly children: ReactNode
  /** When provided, the card becomes an accessible pressable element. */
  readonly onPress?: () => void
  readonly accessibilityLabel?: string
  /**
   * Surface treatment. `elevated` (default) is the standard content card with a
   * restrained shadow; `flat` is a bordered grouping surface with no elevation.
   * This is the shared card contract — feature code must not hand-roll card styles.
   */
  readonly surface?: 'elevated' | 'flat'
  /**
   * `default` (standard content padding) or `none` — for a card used purely
   * as a grouping surface around children that manage their own padding
   * (e.g. a `NavGroup` of `ListRow`s, which already pad themselves).
   */
  readonly padding?: 'default' | 'none'
  readonly testID?: string
}

/** Card primitive — the single shared content surface (DS-3). */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  surface = 'elevated',
  padding = 'default',
  testID,
}: CardProps) {
  const theme = useTheme()
  const surfaceStyle = [
    styles.surface,
    { backgroundColor: theme.bgElevated, borderColor: theme.border },
    padding === 'none' ? styles.noPadding : undefined,
    surface === 'elevated' ? resolveElevation('card') : undefined,
  ]

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={({ pressed }) => [...surfaceStyle, pressed ? styles.pressed : undefined]}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View style={surfaceStyle} testID={testID}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space[4],
  },
  noPadding: {
    padding: 0,
  },
  pressed: {
    opacity: 0.85,
  },
})
