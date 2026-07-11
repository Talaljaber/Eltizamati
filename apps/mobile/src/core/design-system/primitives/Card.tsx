import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { radius, space } from '../tokens'
import { useTheme } from '../use-theme'

export interface CardProps {
  readonly children: ReactNode
  /** When provided, the card becomes an accessible pressable element. */
  readonly onPress?: () => void
  readonly accessibilityLabel?: string
  readonly testID?: string
}

/** Card primitive — surface + padding + optional press (DS-3). */
export function Card({ children, onPress, accessibilityLabel, testID }: CardProps) {
  const theme = useTheme()
  const surfaceStyle = [
    styles.surface,
    { backgroundColor: theme.bgElevated, borderColor: theme.border },
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
  pressed: {
    opacity: 0.85,
  },
})
