import { View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { space, radius } from '../tokens'
import { useTheme } from '../use-theme'

export interface InsightBannerProps {
  title: string
  body: string
  severity: 'urgent' | 'attention' | 'calm'
  action?: React.ReactNode
  /** Unread insights (readAt undefined) get a visible marker (SCR-INS-CENTER read state). */
  unread?: boolean
}

export function InsightBanner({ title, body, severity, action, unread }: InsightBannerProps) {
  const theme = useTheme()
  const icon = severity === 'urgent' ? '🚨' : severity === 'attention' ? '⚠️' : '✅'
  const bgColor =
    severity === 'urgent'
      ? theme.critical + '20'
      : severity === 'attention'
        ? theme.caution + '20'
        : theme.positive + '20'

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor: theme.border },
        unread === true && { borderLeftColor: theme.brand, borderLeftWidth: 3 },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text variant="heading">{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text variant="heading">{title}</Text>
        </View>
        <Text variant="bodySmall" color="secondary">
          {body}
        </Text>
        {action !== undefined && <View style={styles.action}>{action}</View>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: space[2],
  },
  iconContainer: {
    marginEnd: space[3],
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: space[1],
  },
  action: {
    marginTop: space[2],
    alignItems: 'flex-start',
  },
})
