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

const SEVERITY_CONFIG: Record<
  Severity,
  {
    icon: keyof typeof Ionicons.glyphMap
    ink: (t: ReturnType<typeof useTheme>) => string
    surface: (t: ReturnType<typeof useTheme>) => string
  }
> = {
  urgent: {
    icon: 'alert-circle-outline',
    ink: (t) => t.critical,
    surface: (t) => t.criticalSoft,
  },
  attention: {
    icon: 'information-circle-outline',
    ink: (t) => t.attention,
    surface: (t) => t.attentionSoft,
  },
  calm: {
    icon: 'checkmark-circle-outline',
    ink: (t) => t.positive,
    surface: (t) => t.positiveSoft,
  },
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
  const config = SEVERITY_CONFIG[severity]

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { backgroundColor: config.surface(theme), borderColor: theme.border },
        unread === true && { borderLeftColor: theme.brand, borderLeftWidth: 3 },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={config.icon}
          size={20}
          color={config.ink(theme)}
          accessibilityElementsHidden
        />
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
    paddingTop: 2,
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
