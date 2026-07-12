import { View, StyleSheet } from 'react-native'
import { space } from '../tokens'
import { useTheme } from '../use-theme'

export interface TimelineItemProps {
  icon?: React.ReactNode
  isLast?: boolean
  children: React.ReactNode
}

export function TimelineItem({ icon, isLast = false, children }: TimelineItemProps) {
  const theme = useTheme()
  return (
    <View style={styles.container}>
      <View style={styles.iconColumn}>
        <View style={[styles.iconContainer, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          {icon ?? <View style={[styles.dot, { backgroundColor: theme.brand }]} />}
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: theme.border }]} />}
      </View>
      <View style={styles.contentColumn}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  iconColumn: {
    alignItems: 'center',
    marginRight: space[3],
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -4,
    marginBottom: -4,
  },
  contentColumn: {
    flex: 1,
    paddingBottom: space[4],
  },
})
