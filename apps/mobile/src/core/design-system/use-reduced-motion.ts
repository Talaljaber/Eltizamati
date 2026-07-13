import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Tracks the OS "reduce motion" accessibility setting (NFR-A11Y-004).
 * Pair with `motionDuration(ms, reduced)` so transitions collapse to instant/fade
 * when the user has requested reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(value)
    })
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return reduced
}
