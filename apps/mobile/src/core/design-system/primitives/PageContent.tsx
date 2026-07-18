import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { layout, space } from '../tokens'
import { useResponsiveLayout } from '../use-responsive-layout'

export interface PageContentProps {
  readonly children: ReactNode
  /**
   * `content` (default) — dashboards/grids, capped at `layout.contentMaxWidth`.
   * `readable` — text/forms/detail, capped at the narrower `layout.readableMaxWidth`.
   */
  readonly maxWidth?: 'content' | 'readable'
  readonly style?: ViewStyle
  readonly testID?: string
}

/**
 * Centers children in a max-width column with responsive gutters, but only
 * on wide web (`isWideWeb`) — on native and narrow web this is a transparent
 * passthrough, so existing full-bleed mobile layouts are unaffected. This is
 * the one tool screens use to stop stretching edge-to-edge in a browser.
 */
export function PageContent({ children, maxWidth = 'content', style, testID }: PageContentProps) {
  const { isWideWeb } = useResponsiveLayout()

  if (!isWideWeb) {
    return (
      <View style={style} testID={testID}>
        {children}
      </View>
    )
  }

  const cap = maxWidth === 'readable' ? layout.readableMaxWidth : layout.contentMaxWidth

  return (
    <View style={styles.outer} testID={testID}>
      <View style={[styles.inner, { maxWidth: cap }, style]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    paddingHorizontal: space[7],
  },
})
