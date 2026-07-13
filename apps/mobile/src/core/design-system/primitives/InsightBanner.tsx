import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
  testID?: string
}

type Severity = InsightBannerProps['severity']

// Severity is conveyed by the icon glyph only (design-system.md §: never color
// alone). The card itself stays neutral — no tinted surfaces — for a calm,
// professional read; the icon carries the meaning without shouting.
const SEVERITY_ICON: Record<Severity, keyof typeof Ionicons.glyphMap> = {
  urgent: 'alert-circle-outline',
  attention: 'information-circle-outline',
  calm: 'checkmark-circle-outline',
}

export function InsightBanner({
  title,
  body,
  severity,
  action,
  unread,
  testID,
}: InsightBannerProps) {
  const theme = useTheme()

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={SEVERITY_ICON[severity]}
          size={20}
          color={theme.textSecondary}
          accessibilityElementsHidden
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text variant="heading">{title}</Text>
          </View>
          {unread === true && <View style={[styles.unreadDot, { backgroundColor: theme.brand }]} />}
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
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space[2],
  },
  iconContainer: {
    marginEnd: space[3],
    paddingTop: 2,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginBottom: space[1],
  },
  titleText: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  action: {
    marginTop: space[2],
    alignItems: 'flex-start',
  },
})
