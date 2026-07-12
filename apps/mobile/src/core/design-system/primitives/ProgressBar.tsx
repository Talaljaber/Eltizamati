import { View, StyleSheet, type DimensionValue } from 'react-native'
import { radius } from '../tokens'
import { useTheme } from '../use-theme'

export interface ProgressBarProps {
  progress: number // 0 to 1
  color?: string // Defaults to theme.primary
  trackColor?: string // Defaults to theme.border
}

export function ProgressBar({ progress, color, trackColor }: ProgressBarProps) {
  const theme = useTheme()
  const clampedProgress = Math.max(0, Math.min(1, progress))
  const fillWidth: DimensionValue = `${clampedProgress * 100}%`

  return (
    <View style={[styles.track, { backgroundColor: trackColor ?? theme.border }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color ?? theme.brand,
            width: fillWidth,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
})
