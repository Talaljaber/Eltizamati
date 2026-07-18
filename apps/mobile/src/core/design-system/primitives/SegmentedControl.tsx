import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { useTheme } from '../use-theme'
import { useReducedMotion } from '../use-reduced-motion'
import { radius, space, minTouchTarget, motion, motionDuration } from '../tokens'

export interface SegmentedControlOption {
  readonly value: string
  readonly label: string
}

export interface SegmentedControlProps {
  /** Max 3 options — this is a compact either/or choice, not a tab bar. */
  readonly options: readonly SegmentedControlOption[]
  readonly value: string
  readonly onChange: (value: string) => void
  readonly testID?: string
}

/**
 * SegmentedControl — a single either/or choice rendered as one control
 * (replaces two stacked full-width Buttons, which read as two separate
 * actions rather than one choice between them).
 */
export function SegmentedControl({ options, value, onChange, testID }: SegmentedControlProps) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()

  return (
    <View
      style={[styles.container, { backgroundColor: theme.bgInteractive }]}
      accessibilityRole="tablist"
      testID={testID}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          option={option}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  )
}

function Segment({
  option,
  selected,
  onPress,
  reducedMotion,
}: {
  option: SegmentedControlOption
  selected: boolean
  onPress: () => void
  reducedMotion: boolean
}) {
  const theme = useTheme()
  const highlight = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(highlight, {
      toValue: selected ? 1 : 0,
      duration: motionDuration(motion.duration.fast, reducedMotion),
      useNativeDriver: true,
    }).start()
  }, [selected, reducedMotion, highlight])

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
      style={styles.segment}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.highlight,
          { backgroundColor: theme.bgElevated, opacity: highlight },
        ]}
      />
      <Text variant="bodySmall" color={selected ? 'primary' : 'secondary'} align="center">
        {option.label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: space[1],
    gap: space[1],
  },
  segment: {
    flex: 1,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  highlight: {
    margin: 2,
    borderRadius: radius.sm,
  },
})
