import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, Card, FieldRow, ProgressBar, space, useTheme } from '@/core/design-system'
import type { CreditCard } from '@eltizamati/domain'

export interface CardDetailSectionProps {
  obligation: CreditCard
}

function minimumPaymentLabel(
  rule: CreditCard['cardDetails']['minimumPaymentRule'],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (rule === undefined || rule.type === 'unknown') return t('common.unknown')
  if (rule.type === 'fixed') return rule.value.toStorageString()
  return t('cardDetail.minimumPercentRule', {
    percent: rule.value.toStorageString(),
    floor: rule.floor?.toStorageString() ?? t('common.unknown'),
  })
}

export function CardDetailSection({ obligation }: CardDetailSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const details = obligation.cardDetails

  const limit = details.creditLimit.value
  const balance = details.currentBalance.value
  const available = limit.subtract(balance)
  const utilization = limit.isZero()
    ? 0
    : balance.toDecimal().dividedBy(limit.toDecimal()).toNumber()
  const utilizationOver70 = utilization > 0.7

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.title}>
          <Text variant="heading">{t('obligationDetail.cardSection')}</Text>
        </View>
        <FieldRow label={t('obligationDetail.creditLimit')} value={limit.toStorageString()} />
        <FieldRow label={t('obligationDetail.currentBalance')} value={balance.toStorageString()} />
        <FieldRow label={t('cardDetail.availableCredit')} value={available.toStorageString()} />

        <View style={styles.utilizationSection}>
          <ProgressBar
            progress={utilization}
            color={utilizationOver70 ? theme.critical : theme.brand}
          />
          <Text
            variant="bodySmall"
            color={utilizationOver70 ? 'critical' : 'secondary'}
            align="end"
          >
            {t('obligationDetail.utilization')}: {(utilization * 100).toFixed(0)}%
          </Text>
        </View>
      </Card>

      <Card>
        <View style={styles.title}>
          <Text variant="heading">{t('cardDetail.statementSection')}</Text>
        </View>
        <FieldRow
          label={t('cardDetail.statementBalance')}
          value={details.statementBalance?.value.toStorageString() ?? t('common.unknown')}
        />
        <FieldRow
          label={t('obligationDetail.minimumPayment')}
          value={minimumPaymentLabel(details.minimumPaymentRule, t)}
        />
        <Text variant="caption" color="secondary">
          {t('cardDetail.minimumPaymentCaveat')}
        </Text>
        <FieldRow
          label={t('obligationDetail.dueDate')}
          value={details.dueDate ?? t('common.unknown')}
        />
      </Card>

      <Card>
        <View style={styles.title}>
          <Text variant="heading">{t('cardDetail.ratesFeesSection')}</Text>
        </View>
        <FieldRow
          label={t('cardDetail.purchaseApr')}
          value={details.purchaseApr?.value.toStorageString() ?? t('common.unknown')}
        />
        <FieldRow
          label={t('cardDetail.cashAdvanceApr')}
          value={details.cashAdvanceApr?.value.toStorageString() ?? t('common.unknown')}
        />
        {(details.fees ?? []).length === 0 ? (
          <Text variant="bodySmall" color="secondary">
            {t('cardDetail.noFeesOnFile')}
          </Text>
        ) : (
          (details.fees ?? []).map((fee, idx) => (
            <FieldRow
              key={`${fee.type}-${idx}`}
              label={t(`cardDetail.feeType.${fee.type}`)}
              value={fee.amount.value.toStorageString()}
            />
          ))
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: space[4],
  },
  title: {
    marginBottom: space[4],
  },
  utilizationSection: {
    marginTop: space[4],
    gap: space[2],
  },
})
