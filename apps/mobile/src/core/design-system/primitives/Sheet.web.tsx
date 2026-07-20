import { createPortal } from 'react-dom'
import { View, StyleSheet, Pressable, TouchableWithoutFeedback, type ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { minTouchTarget, space, radius } from '../tokens'
import { useTheme } from '../use-theme'
import type { SheetProps } from './Sheet'

/**
 * `position: 'fixed'` isn't in React Native's `ViewStyle` type (native has
 * no such concept), but react-native-web compiles it straight to CSS.
 */
const overlayRootStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
} as unknown as ViewStyle

/**
 * Web implementation — Metro picks this file automatically over Sheet.tsx
 * when bundling for web (`.web.tsx` platform extension).
 *
 * RN's `Modal` has recurring focus-handling bugs on react-native-web, so
 * this renders a plain overlay instead. `position: fixed` alone isn't
 * enough though: any ancestor with a CSS transform (React Navigation's
 * stack screens use one for the slide transition) turns 'fixed' into
 * 'absolute' relative to that ancestor instead of the viewport, boxing the
 * overlay into whatever the transformed container's bounds happen to be.
 * Portaling straight to `document.body` sidesteps that regardless of where
 * in the tree this is rendered.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  const { t } = useTranslation()

  if (!visible) return null

  return createPortal(
    <View style={overlayRootStyle}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { backgroundColor: theme.bgElevated }]}>
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
    </View>,
    document.body,
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
    bottom: 0,
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
    paddingBottom: space[8],
  },
})
