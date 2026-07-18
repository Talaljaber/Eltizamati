import type { ReactNode } from 'react'
import { I18nManager, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme, space, radius } from '@/core/design-system'
import type { AmortizationScheduleRow } from '../hooks/use-amortization-schedule-view-model'

export const SCHEDULE_ROW_HEIGHT = 76

export interface ScheduleRowProps {
  readonly entry: AmortizationScheduleRow
  readonly periodLabel: string
  readonly installment: ReactNode
  readonly contextLabel?: string
  readonly onPress: () => void
}

/**
 * ScheduleRow — one compact, fixed-height amortization row (period badge +
 * cost-change context + the installment as the row's dominant figure).
 * Replaces the previous "Period N" mini-form of four stacked FieldRows;
 * tapping opens the full breakdown in a Sheet (progressive disclosure).
 */
export function ScheduleRow({
  entry,
  periodLabel,
  installment,
  contextLabel,
  onPress,
}: ScheduleRowProps) {
  const theme = useTheme()
  const chevronIcon = I18nManager.isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'
  const change = entry.costPercentChangeFromPrevious

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={periodLabel}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, backgroundColor: pressed ? theme.bgSubtle : undefined },
      ]}
    >
      <View style={[styles.periodBadge, { backgroundColor: theme.bgSubtle }]}>
        <Text variant="caption" color="secondary">
          {entry.period}
        </Text>
      </View>
      <View style={styles.content}>
        <Text variant="body" numberOfLines={1}>
          {periodLabel}
        </Text>
        {contextLabel !== undefined ? (
          <Text variant="caption" color="caution">
            {contextLabel}
          </Text>
        ) : change !== undefined ? (
          <Text variant="caption" color={change > 0 ? 'critical' : 'positive'}>
            {change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {installment}
        <Ionicons name={chevronIcon} size={16} color={theme.textTertiary} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    height: SCHEDULE_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: space[1],
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    flexShrink: 0,
  },
})
