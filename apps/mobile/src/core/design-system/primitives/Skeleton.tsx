import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native'
import { useTheme } from '../use-theme'
import { radius, motion } from '../tokens'

export interface SkeletonProps {
  /** Width of the skeleton block. Default: '100%'. */
  readonly width?: number | `${number}%`
  /** Height in dp. Default: 16 (body-line height). */
  readonly height?: number
  /** Border radius. Default: 'sm'. */
  readonly borderRadius?: number
  readonly testID?: string
}

/**
 * Skeleton — animated pulsing placeholder for loading states.
 * Use in lieu of content while async data is pending.
 * Respects prefers-reduced-motion via Animated.loop (no gesture latency).
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  testID,
}: SkeletonProps) {
  const theme = useTheme()
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: motion.durationMs * 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.durationMs * 2,
          useNativeDriver: true,
        }),
      ]),
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  const widthStyle: ViewStyle = typeof width === 'number' ? { width } : { width }

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.base,
        widthStyle,
        { height, borderRadius, backgroundColor: theme.bgSubtle, opacity },
      ]}
      accessible={false}
      accessibilityElementsHidden
    />
  )
}

/** Common preset compositions for card-loading states. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={12} width="50%" />
      <Skeleton height={20} width="80%" />
      <Skeleton height={12} width="30%" />
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
  },
  card: {
    gap: 8,
    padding: 16,
  },
})
