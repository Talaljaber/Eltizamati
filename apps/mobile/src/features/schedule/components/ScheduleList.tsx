import { useState, type ReactNode } from 'react'
import { FlatList, View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FieldRow, Sheet, Text, space } from '@/core/design-system'
import type { AmortizationScheduleRow } from '../hooks/use-amortization-schedule-view-model'
import { ScheduleRow, SCHEDULE_ROW_HEIGHT } from './ScheduleRow'

export interface ScheduleListProps {
  readonly schedule: readonly AmortizationScheduleRow[]
  readonly renderAmount: (value: string) => ReactNode
  readonly header?: ReactNode
}

/**
 * ScheduleList — a real virtualized list for the amortization schedule
 * (fixed row height + getItemLayout), replacing an unvirtualized `.map` of
 * N stacked mini-forms inside a ScrollView. Tapping a row opens its full
 * four-field breakdown in a Sheet.
 */
export function ScheduleList({ schedule, renderAmount, header }: ScheduleListProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<AmortizationScheduleRow | undefined>(undefined)

  return (
    <>
      <FlatList
        data={schedule}
        ListHeaderComponent={header === undefined ? undefined : <>{header}</>}
        keyExtractor={(entry) => String(entry.period)}
        getItemLayout={(_, index) => ({
          length: SCHEDULE_ROW_HEIGHT,
          offset: SCHEDULE_ROW_HEIGHT * index,
          index,
        })}
        renderItem={({ item }) => (
          <ScheduleRow
            entry={item}
            periodLabel={`${t('schedule.period')} ${item.period}`}
            installment={renderAmount(item.finalBalloonAmount ?? item.payment)}
            contextLabel={
              item.finalBalloonAmount === undefined
                ? undefined
                : item.finalBalloonKind === 'agreed'
                  ? t('schedule.agreedBalloonBadge')
                  : t('schedule.projectedBalloonBadge')
            }
            onPress={() => setSelected(item)}
          />
        )}
      />
      <Sheet
        visible={selected !== undefined}
        onClose={() => setSelected(undefined)}
        title={selected ? `${t('schedule.period')} ${selected.period}` : undefined}
      >
        {selected ? (
          <View style={styles.detail}>
            <FieldRow label={t('schedule.installment')} value={renderAmount(selected.payment)} />
            <FieldRow
              label={t('schedule.principalPortion')}
              value={renderAmount(selected.principal)}
            />
            <FieldRow label={t('schedule.interestPortion')} value={renderAmount(selected.cost)} />
            <FieldRow
              label={t('schedule.endingBalance')}
              value={renderAmount(selected.closingBalance)}
            />
            {selected.finalBalloonAmount !== undefined && (
              <FieldRow
                label={
                  selected.finalBalloonKind === 'agreed'
                    ? t('schedule.agreedFinalBalloon')
                    : t('schedule.projectedFinalBalloon')
                }
                value={renderAmount(selected.finalBalloonAmount)}
              />
            )}
            {selected.costPercentChangeFromPrevious !== undefined ? (
              <Text
                variant="bodySmall"
                color={selected.costPercentChangeFromPrevious > 0 ? 'critical' : 'positive'}
              >
                {selected.costPercentChangeFromPrevious > 0
                  ? t('schedule.costIncreaseBadge', {
                      percent: selected.costPercentChangeFromPrevious.toFixed(1),
                    })
                  : t('schedule.costDecreaseBadge', {
                      percent: Math.abs(selected.costPercentChangeFromPrevious).toFixed(1),
                    })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  detail: {
    gap: space[2],
  },
})
