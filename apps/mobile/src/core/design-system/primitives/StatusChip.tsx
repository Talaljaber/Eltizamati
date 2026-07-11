import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { ObligationStatus } from '@eltizamati/domain'
import { Text } from './Text'
import { useTheme } from '../use-theme'
import { radius, space } from '../tokens'

export interface StatusChipProps {
  readonly status: ObligationStatus
  readonly testID?: string
}

/**
 * StatusChip — displays the derived ObligationStatus with semantic color.
 * Maps status → i18n label (status.* namespace) and design-token color.
 * Status NEVER derived here — caller passes the already-derived status
 * (AI_AGENT_RULES §10, BR-STAT-001).
 */
export function StatusChip({ status, testID }: StatusChipProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const config = STATUS_CONFIG[status]

  const chipStyle = getChipStyle(config.colorKey, theme)

  return (
    <View
      style={[styles.chip, { backgroundColor: chipStyle.bg }]}
      testID={testID}
      accessible
      accessibilityLabel={t(config.labelKey)}
      accessibilityRole="text"
    >
      <Text variant="caption" color={chipStyle.textColor}>
        {t(config.labelKey)}
      </Text>
    </View>
  )
}

type ColorKey = 'positive' | 'caution' | 'critical' | 'info' | 'neutral'
type TextColor =
  'primary' | 'secondary' | 'tertiary' | 'brand' | 'critical' | 'positive' | 'caution'

function getChipStyle(
  colorKey: ColorKey,
  theme: ReturnType<typeof useTheme>,
): { bg: string; textColor: TextColor } {
  switch (colorKey) {
    case 'positive':
      return { bg: theme.positiveSoft, textColor: 'positive' }
    case 'caution':
      return { bg: theme.cautionSoft, textColor: 'caution' }
    case 'critical':
      return { bg: theme.criticalSoft, textColor: 'critical' }
    case 'info':
      return { bg: theme.infoSoft, textColor: 'brand' }
    case 'neutral':
      return { bg: theme.bgSubtle, textColor: 'secondary' }
  }
}

const STATUS_CONFIG: Record<ObligationStatus, { labelKey: string; colorKey: ColorKey }> = {
  onTrack: { labelKey: 'status.onTrack', colorKey: 'positive' },
  dueSoon: { labelKey: 'status.dueSoon', colorKey: 'caution' },
  overdue: { labelKey: 'status.overdue', colorKey: 'critical' },
  delinquent: { labelKey: 'status.delinquent', colorKey: 'critical' },
  attentionRequired: { labelKey: 'status.attentionRequired', colorKey: 'caution' },
  dataStale: { labelKey: 'status.dataStale', colorKey: 'neutral' },
  calculationIncomplete: { labelKey: 'status.calculationIncomplete', colorKey: 'info' },
  notStarted: { labelKey: 'status.notStarted', colorKey: 'neutral' },
  completed: { labelKey: 'status.completed', colorKey: 'positive' },
  unknown: { labelKey: 'status.unknown', colorKey: 'neutral' },
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
})
