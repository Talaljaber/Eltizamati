import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { radius, space, useReducedMotion, useTheme } from '@/core/design-system'

/** Assistant-styled bubble with three staggered pulsing dots — "Eltizamati is composing a reply." */
export function TypingIndicator() {
  const { t } = useTranslation()
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const dotA = useRef(new Animated.Value(0.3)).current
  const dotB = useRef(new Animated.Value(0.3)).current
  const dotC = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    if (reducedMotion) return

    function pulse(value: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      )
    }

    const animations = [pulse(dotA, 0), pulse(dotB, 150), pulse(dotC, 300)]
    animations.forEach((animation) => animation.start())
    return () => animations.forEach((animation) => animation.stop())
  }, [dotA, dotB, dotC, reducedMotion])

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: theme.bgElevated, borderColor: theme.border },
        ]}
        accessibilityLabel={t('learn.assistantTyping')}
        accessibilityRole="text"
      >
        <Animated.View style={[styles.dot, { backgroundColor: theme.textTertiary, opacity: dotA }]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.textTertiary, opacity: dotB }]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.textTertiary, opacity: dotC }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    borderRadius: radius.lg,
    borderBottomStartRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
})
