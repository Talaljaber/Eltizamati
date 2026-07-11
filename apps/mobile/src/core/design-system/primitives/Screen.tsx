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
  readonly testID?: string
}

/**
 * Screen primitive — safe area + gutter + scroll behavior + skeleton slot.
 * Every route renders its content inside exactly one `Screen` (DS-3).
 */
export function Screen({ children, scroll = true, loading = false, skeleton, testID }: ScreenProps) {
  const theme = useTheme()
  const content = loading ? (skeleton ?? children) : children

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.gutter}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.gutter}>{content}</View>
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
