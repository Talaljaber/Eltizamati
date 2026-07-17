import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/**
 * Tracks the live keyboard height via raw `Keyboard` events instead of
 * `KeyboardAvoidingView` — needed for content rendered inside RN's `Modal`,
 * where `KeyboardAvoidingView` is known to be unreliable on Android (the
 * Modal opens a separate native window that doesn't reliably participate in
 * the parent view's keyboard-avoidance). `Keyboard` events are global and
 * do cross that boundary, so this works regardless.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height)
    })
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setHeight(0)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  return height
}
