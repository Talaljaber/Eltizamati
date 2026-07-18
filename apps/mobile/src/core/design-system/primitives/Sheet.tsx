import { View, StyleSheet, Modal, Platform, TouchableWithoutFeedback, type ViewStyle } from 'react-native'
import { Text } from './Text'
import { space, radius } from '../tokens'
import { useTheme } from '../use-theme'
import { useKeyboardHeight } from '../use-keyboard-height'

export interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * `position: 'fixed'` isn't in React Native's `ViewStyle` type (native has no
 * such concept), but react-native-web compiles it straight to CSS — this is
 * a web-only style, hence the cast.
 */
const webOverlayRootStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
} as unknown as ViewStyle

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  // Raw keyboard-height tracking (not KeyboardAvoidingView — unreliable inside
  // Modal on Android, see use-keyboard-height.ts) keeps the sheet, and any
  // scrollable search results inside it, pinned above the keyboard.
  const keyboardHeight = useKeyboardHeight()

  const content = (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { backgroundColor: theme.bgElevated, bottom: keyboardHeight }]}>
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>
        {title !== undefined && title !== '' && (
          <View style={{ marginBottom: 16 }}>
            <Text variant="heading">{title}</Text>
          </View>
        )}
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  )

  // RN's `Modal` renders through a native/portal layer that react-native-web
  // has recurring focus-handling bugs with — text inputs inside it can lose
  // keystrokes on web. A plain fixed-position overlay sidesteps that whole
  // class of bug and needs no native modal semantics in a browser anyway.
  if (Platform.OS === 'web') {
    if (!visible) return null
    return <View style={webOverlayRootStyle}>{content}</View>
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {content}
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space[4],
    maxHeight: '90%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingBottom: space[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
  },
  title: {
    marginBottom: space[4],
  },
  content: {
    paddingBottom: space[8], // safe area padding
  },
})
