import { View, StyleSheet, Modal, Pressable, TouchableWithoutFeedback } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { minTouchTarget, space, radius } from '../tokens'
import { useTheme } from '../use-theme'
import { useKeyboardHeight } from '../use-keyboard-height'

export interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * Native only — see `Sheet.web.tsx` for the web implementation. RN's `Modal`
 * has recurring focus-handling bugs on react-native-web, so web renders a
 * portal instead rather than going through this file at all.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  const { t } = useTranslation()
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
          <View style={styles.headerRow}>
            {title !== undefined && title !== '' ? (
              <Text variant="heading">{title}</Text>
            ) : (
              <View />
            )}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={8}
              style={styles.closeButton}
              testID="sheet-close-button"
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
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
    maxHeight: '60%',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[4],
  },
  closeButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: space[8], // safe area padding
  },
})
