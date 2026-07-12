import { View, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native'
import { Text } from './Text'
import { space, radius } from '../tokens'
import { useTheme } from '../use-theme'

export interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { backgroundColor: theme.bgElevated }]}>
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
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
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
