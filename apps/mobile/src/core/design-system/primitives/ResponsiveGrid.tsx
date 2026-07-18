import { Children, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { layout, space } from '../tokens'
import { useResponsiveLayout } from '../use-responsive-layout'

export interface ResponsiveGridProps {
  readonly children: ReactNode
  /** Minimum width a column needs before another one is added. Default 320. */
  readonly minColumnWidth?: number
  readonly testID?: string
}

/**
 * Wraps children into a responsive multi-column flow on wide web; renders a
 * single full-width column (today's behavior) on native and narrow web.
 * Column count is derived from the viewport, not a fixed prop, so it adapts
 * as the browser window resizes.
 */
export function ResponsiveGrid({ children, minColumnWidth = 320, testID }: ResponsiveGridProps) {
  const { isWideWeb, width } = useResponsiveLayout()

  if (!isWideWeb) {
    return (
      <View style={styles.singleColumn} testID={testID}>
        {children}
      </View>
    )
  }

  // `width` is the full browser viewport, but wide-web content actually renders
  // inside the sidebar-adjacent, contentMaxWidth-capped column (PageContent) —
  // sizing columns off the raw viewport left a handful of cards pinned narrow
  // in the top-left with the rest of the screen blank. Cap at contentMaxWidth,
  // and never plan more columns than there are children to fill them.
  const effectiveWidth = Math.min(width, layout.contentMaxWidth)
  const childCount = Children.count(children)
  const columns = Math.min(Math.max(1, Math.floor(effectiveWidth / minColumnWidth)), childCount)
  const itemWidthPercent = 100 / columns

  return (
    <View style={styles.grid} testID={testID}>
      {Children.map(children, (child, index) => (
        <View key={index} style={{ width: `${itemWidthPercent}%` }}>
          <View style={styles.cell}>{child}</View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  singleColumn: {
    gap: space[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    padding: space[2],
  },
})
