import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { space } from '../tokens'
import { useTheme } from '../use-theme'
import { PageContent } from './PageContent'

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
  /**
   * Opt-in wide-web centering, folded in via `PageContent` (undefined = no
   * change, today's full-bleed gutter on every platform). Pass `'content'`
   * for dashboards/grids or `'readable'` for forms/detail/text screens.
   */
  readonly maxWidth?: 'content' | 'readable'
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
  maxWidth,
  testID,
}: ScreenProps) {
  const theme = useTheme()
  const content = loading ? (skeleton ?? children) : children
  const gutterStyle = [styles.gutter, gap !== undefined ? { gap: space[gap] } : undefined]
  const body =
    maxWidth !== undefined ? <PageContent maxWidth={maxWidth}>{content}</PageContent> : content

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.bg }]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={gutterStyle} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={gutterStyle}>{body}</View>
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
