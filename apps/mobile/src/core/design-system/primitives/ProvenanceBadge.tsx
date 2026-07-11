import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { SourceClass } from '@eltizamati/domain'
import { Text } from './Text'
import { useTheme } from '../use-theme'
import { radius, space } from '../tokens'

export interface ProvenanceBadgeProps {
  readonly source: SourceClass
  readonly testID?: string
}

/**
 * ProvenanceBadge — compact badge showing data source class (data-provenance.md §2).
 * Used alongside Amount/material figures to satisfy BR-PROV-001 honesty requirements.
 * Only renders for non-demo sources in personal mode; always renders in demo mode
 * (C-07: mock/demo data always labeled).
 */
export function ProvenanceBadge({ source, testID }: ProvenanceBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const config = PROVENANCE_CONFIG[source]

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bgColor(theme), borderColor: config.borderColor(theme) },
      ]}
      testID={testID}
      accessible
      accessibilityLabel={t(config.labelKey)}
      accessibilityRole="text"
    >
      <Text variant="caption" color={config.textColor}>
        {config.icon} {t(config.labelKey)}
      </Text>
    </View>
  )
}

type TextColor =
  'primary' | 'secondary' | 'tertiary' | 'brand' | 'critical' | 'positive' | 'caution'
type ColorScheme = ReturnType<typeof useTheme>

const PROVENANCE_CONFIG: Record<
  SourceClass,
  {
    labelKey: string
    icon: string
    textColor: TextColor
    bgColor: (t: ColorScheme) => string
    borderColor: (t: ColorScheme) => string
  }
> = {
  official: {
    labelKey: 'provenance.official',
    icon: '✓',
    textColor: 'positive',
    bgColor: (t) => t.positiveSoft,
    borderColor: (t) => t.positive,
  },
  bureau: {
    labelKey: 'provenance.bureau',
    icon: '📊',
    textColor: 'brand',
    bgColor: (t) => t.brandSoft,
    borderColor: (t) => t.brand,
  },
  userEntered: {
    labelKey: 'provenance.userEntered',
    icon: '✏',
    textColor: 'secondary',
    bgColor: (t) => t.bgSubtle,
    borderColor: (t) => t.border,
  },
  estimate: {
    labelKey: 'provenance.estimate',
    icon: '~',
    textColor: 'secondary',
    bgColor: (t) => t.bgSubtle,
    borderColor: (t) => t.border,
  },
  demo: {
    labelKey: 'provenance.demo',
    icon: '🎯',
    textColor: 'caution',
    bgColor: (t) => t.cautionSoft,
    borderColor: (t) => t.caution,
  },
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
})
