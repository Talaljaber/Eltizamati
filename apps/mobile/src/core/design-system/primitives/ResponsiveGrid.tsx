import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { space } from '../tokens'
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

  const columns = Math.max(1, Math.floor(width / minColumnWidth))
  const itemWidthPercent = 100 / columns

  return (
    <View style={styles.grid} testID={testID}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <View key={index} style={{ width: `${itemWidthPercent}%` }}>
              <View style={styles.cell}>{child}</View>
            </View>
          ))
        : children}
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
