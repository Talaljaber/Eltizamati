import { FlatList, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Amount,
  Card,
  FieldRow,
  InsightBanner,
  Text,
  space,
  radius,
  useTheme,
} from '@/core/design-system'
import { engineEstimate, type Provenance } from '@eltizamati/domain'
import type { MurabahaScheduleViewModel, MurabahaScheduleRow } from '../hooks/use-murabaha-schedule-view-model'

const ROW_HEIGHT = 72

export interface MurabahaScheduleListProps {
  readonly viewModel: MurabahaScheduleViewModel
}

/**
 * MurabahaScheduleList — the fixed Murabaha installment schedule.
 *
 * Unlike the conventional amortization view there is deliberately no
 * principal/profit split and no "vs last period" change column: a Murabaha's
 * sale price and installments are fixed at signing (BR-CALC-020), so every
 * installment is identical and the schedule's job is to make that fixedness
 * plainly legible, not to model repricing.
 */
export function MurabahaScheduleList({ viewModel }: MurabahaScheduleListProps) {
  const { t } = useTranslation()
  const {
    rows,
    totalSalePrice,
    standardInstallment,
    termMonths,
    installmentProvenance,
    hasAdjustedFinalInstallment,
  } = viewModel

  const header = (
    <View style={styles.header}>
      <Card surface="flat">
        <View style={styles.summaryContent}>
          <Text variant="heading">{t('murabahaSchedule.fixedTitle')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('murabahaSchedule.fixedExplainer')}
          </Text>
          {totalSalePrice !== undefined && installmentProvenance !== undefined && (
            <FieldRow
              label={t('murabahaSchedule.totalSalePrice')}
              value={
                <Amount
                  money={totalSalePrice}
                  provenance={installmentProvenance}
                  variant="body"
                />
              }
            />
          )}
          {standardInstallment !== undefined && installmentProvenance !== undefined && (
            <FieldRow
              label={t('murabahaSchedule.fixedInstallment')}
              value={
                <Amount
                  money={standardInstallment}
                  provenance={installmentProvenance}
                  variant="body"
                />
              }
            />
          )}
          {termMonths !== undefined && (
            <FieldRow
              label={t('murabahaSchedule.term')}
              value={t('murabahaSchedule.termMonths', { months: termMonths })}
            />
          )}
        </View>
      </Card>
      {hasAdjustedFinalInstallment && (
        <View style={styles.notice}>
          <InsightBanner
            severity="calm"
            title={t('murabahaSchedule.finalAdjustedTitle')}
            body={t('murabahaSchedule.finalAdjustedBody')}
          />
        </View>
      )}
      <View style={styles.projectionNote}>
        <Text variant="caption" color="secondary">
          {t('murabahaSchedule.projectionNote')}
        </Text>
      </View>
    </View>
  )

  return (
    <FlatList
      data={rows}
      ListHeaderComponent={header}
      keyExtractor={(row) => String(row.period)}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      renderItem={({ item }) => (
        <ScheduleRow row={item} installmentProvenance={installmentProvenance} />
      )}
    />
  )
}

function ScheduleRow({
  row,
  installmentProvenance,
}: {
  row: MurabahaScheduleRow
  installmentProvenance?: Provenance
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  // The running balance is a projection of the fixed agreed installments
  // (assumes each is paid on schedule), so it renders as an estimate — the
  // installment itself keeps its official contract provenance.
  const remaining = engineEstimate(
    row.remainingFinancing,
    'murabaha-fixed-schedule',
    row.date,
  )

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={[styles.periodBadge, { backgroundColor: theme.bgSubtle }]}>
        <Text variant="caption" color="secondary">
          {row.period}
        </Text>
      </View>
      <View style={styles.rowContent}>
        <Text variant="body" numberOfLines={1}>
          {`${t('schedule.period')} ${row.period}`}
        </Text>
        <Text variant="caption" color="secondary">
          {row.date}
        </Text>
      </View>
      <View style={styles.rowTrailing}>
        {installmentProvenance !== undefined && (
          <Amount money={row.installment} provenance={installmentProvenance} variant="amountSm" />
        )}
        <Text variant="caption" color="secondary">
          {t('murabahaSchedule.remainingShort')}{' '}
          <Amount
            money={remaining.value}
            provenance={remaining.provenance}
            precision="estimate"
            variant="caption"
          />
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: space[3],
    padding: space[4],
    paddingBottom: space[2],
  },
  summaryContent: {
    gap: space[2],
  },
  notice: {
    gap: space[2],
  },
  projectionNote: {
    paddingHorizontal: space[1],
  },
  row: {
    height: ROW_HEIGHT,
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
  rowContent: {
    flex: 1,
    gap: space[1],
  },
  rowTrailing: {
    alignItems: 'flex-end',
    gap: space[1],
    flexShrink: 0,
  },
})
