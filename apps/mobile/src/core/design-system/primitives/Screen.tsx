import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { space } from '../tokens'
import { useTheme } from '../use-theme'

export interface ScreenProps {
  readonly children: ReactNode
  /** Renders children inside a ScrollView (default: true). */
  readonly scroll?: boolean
  /** While true, renders `skeleton` instead of `children` (loading state — design-system.md §2). */
  readonly loading?: boolean
  readonly skeleton?: ReactNode
  /**
   * Vertical gap between direct children, from the spacing scale. Opt-in
   * (undefined = no gap) so existing screens that manage their own spacing
   * are unaffected; new/redesigned screens pass a scale index directly.
   */
  readonly gap?: keyof typeof space
  readonly testID?: string
}

/**
 * Screen primitive — safe area + gutter + scroll behavior + skeleton slot.
 * Every route renders its content inside exactly one `Screen` (DS-3).
 */
export function Screen({
  children,
  scroll = true,
  loading = false,
  skeleton,
  gap,
  testID,
}: ScreenProps) {
  const theme = useTheme()
  const content = loading ? (skeleton ?? children) : children
  const gutterStyle = [styles.gutter, gap !== undefined ? { gap: space[gap] } : undefined]

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.bg }]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={gutterStyle} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={gutterStyle}>{content}</View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gutter: {
    paddingHorizontal: space[5],
    paddingVertical: space[4],
  },
})
