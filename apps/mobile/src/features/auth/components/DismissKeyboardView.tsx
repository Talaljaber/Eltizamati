import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useKeyboardHeight } from '@/core/design-system'

/**
 * Wraps form content in a scroll view that stays clear of the keyboard.
 *
 * This deliberately does NOT use `KeyboardAvoidingView`: that component's
 * `'height'`/`'padding'` behaviors assume a particular native window mode
 * (Android's `adjustResize` vs `adjustPan`) that this app never pins down
 * explicitly, and — critically — `android.softwareKeyboardLayoutMode` in
 * app.json only takes effect in a real prebuild; it does nothing inside
 * Expo Go, which is how this screen is actually tested. Tracking the raw
 * `Keyboard` show/hide events instead (`useKeyboardHeight`, the same
 * mechanism `Sheet` already relies on for the identical reason) works
 * identically across Expo Go, dev builds, iOS, and Android, so padding the
 * scroll content by the live keyboard height reliably leaves room to
 * scroll the submit button/terms row above the keyboard instead of behind
 * it. `keyboardShouldPersistTaps="handled"` keeps buttons/links tappable
 * while the keyboard is open; `keyboardDismissMode="on-drag"` replaces the
 * old tap-anywhere-to-dismiss behavior.
 */
export function DismissKeyboardView({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const keyboardHeight = useKeyboardHeight()

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.contentContainer, style, { paddingBottom: keyboardHeight }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentContainer: { flexGrow: 1 },
})
