import { View, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native'
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

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  // Raw keyboard-height tracking (not KeyboardAvoidingView — unreliable inside
  // Modal on Android, see use-keyboard-height.ts) keeps the sheet, and any
  // scrollable search results inside it, pinned above the keyboard.
  const keyboardHeight = useKeyboardHeight()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View
          style={[styles.sheet, { backgroundColor: theme.bgElevated, bottom: keyboardHeight }]}
        >
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
