import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import type { SourceClass } from '@eltizamati/domain'
import { Text } from './Text'
import { useTheme } from '../use-theme'
import { radius, space } from '../tokens'

export interface ProvenanceBadgeProps {
  readonly source: SourceClass
  readonly testID?: string
}

/**
 * ProvenanceBadge — compact badge showing data source class (BR-PROV-001 honesty).
 * Distinction never relies on color alone: every class carries an icon AND a label.
 * Only renders for non-demo sources in personal mode; always renders in demo mode
 * (C-07: mock/demo data always labeled).
 */
export function ProvenanceBadge({ source, testID }: ProvenanceBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const config = PROVENANCE_CONFIG[source]
  const label = t(config.labelKey)
  const inkColor = config.ink(theme)

  return (
    <View
      style={[styles.badge, { backgroundColor: config.surface(theme), borderColor: inkColor }]}
      testID={testID}
      accessible
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <Ionicons name={config.icon} size={12} color={inkColor} accessibilityElementsHidden />
      <Text variant="caption" color={config.textColor}>
        {label}
      </Text>
    </View>
  )
}

type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'critical'
  | 'positive'
  | 'caution'
  | 'understanding'
type ColorScheme = ReturnType<typeof useTheme>

const PROVENANCE_CONFIG: Record<
  SourceClass,
  {
    labelKey: string
    icon: keyof typeof Ionicons.glyphMap
    textColor: TextColor
    ink: (t: ColorScheme) => string
    surface: (t: ColorScheme) => string
  }
> = {
  official: {
    labelKey: 'provenance.official',
    icon: 'shield-checkmark-outline',
    textColor: 'brand',
    ink: (t) => t.official,
    surface: (t) => t.officialSurface,
  },
  bureau: {
    labelKey: 'provenance.bureau',
    icon: 'business-outline',
    textColor: 'brand',
    ink: (t) => t.brand,
    surface: (t) => t.brandSoft,
  },
  userEntered: {
    labelKey: 'provenance.userEntered',
    icon: 'create-outline',
    textColor: 'secondary',
    ink: (t) => t.userEntered,
    surface: (t) => t.userEnteredSurface,
  },
  estimate: {
    labelKey: 'provenance.estimate',
    icon: 'calculator-outline',
    textColor: 'secondary',
    ink: (t) => t.estimate,
    surface: (t) => t.estimateSurface,
  },
  demo: {
    labelKey: 'provenance.demo',
    icon: 'flask-outline',
    textColor: 'caution',
    ink: (t) => t.caution,
    surface: (t) => t.cautionSoft,
  },
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
})
