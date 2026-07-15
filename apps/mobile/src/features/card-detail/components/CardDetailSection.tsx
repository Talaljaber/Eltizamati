import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Text,
  Card,
  FieldRow,
  ProgressBar,
  Amount,
  ProvenanceBadge,
  space,
  useTheme,
} from '@/core/design-system'
import { formatMoneyOfficial } from '@/core/formatting/format-money'
import type { CreditCard, Provenance, Rate, Sourced } from '@eltizamati/domain'

export interface CardDetailSectionProps {
  obligation: CreditCard
}

function minimumPaymentLabel(
  rule: CreditCard['cardDetails']['minimumPaymentRule'],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  // minimum_payment_rule_json has no companion *_prov column (it's a non-material
  // derived-terms bag, not a core queryable field — see the card_details migration
  // comment) — there is no real Provenance to attach, so this stays outside Amount
  // (which requires one) while still using the single approved money formatter for
  // currency correctness, per DS-2.
  if (rule === undefined || rule.type === 'unknown') return t('common.unknown')
  if (rule.type === 'fixed') {
    return formatMoneyOfficial(rule.value, t(`currency.${rule.value.currency.toLowerCase()}`))
  }
  return t('cardDetail.minimumPercentRule', {
    percent: rule.value.toStorageString(),
    floor:
      rule.floor !== undefined
        ? formatMoneyOfficial(rule.floor, t(`currency.${rule.floor.currency.toLowerCase()}`))
        : t('common.unknown'),
  })
}

/** BR-CALC-014-style honesty for a client-derived precision: an estimate never
 * inherits its inputs' 'official' source, regardless of how official those
 * inputs are — it is the derivation itself that is unconfirmed by the server. */
function derivedEstimateProvenance(recordedAt: string): Provenance {
  return { source: 'estimate', observedAt: recordedAt, recordedAt }
}

function ratePercentLabel(rate: Sourced<Rate>): string {
  return `${rate.value.toPercent().toFixed(2)}%`
}

export function CardDetailSection({ obligation }: CardDetailSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const details = obligation.cardDetails

  const limit = details.creditLimit.value
  const balance = details.currentBalance.value
  const available = limit.subtract(balance)
  // F-08: available credit is computed here, client-side — it is never itself
  // an officially-supplied server value, regardless of how official its inputs
  // are, so it always renders with estimate precision and an estimate provenance.
  const availableProvenance = derivedEstimateProvenance(new Date().toISOString())
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
        <FieldRow
          label={t('obligationDetail.creditLimit')}
          value={
            <Amount
              money={limit}
              provenance={details.creditLimit.provenance}
              precision={details.creditLimit.provenance.source === 'estimate' ? 'estimate' : 'official'}
              variant="body"
            />
          }
        />
        <FieldRow
          label={t('obligationDetail.currentBalance')}
          value={
            <Amount
              money={balance}
              provenance={details.currentBalance.provenance}
              precision={
                details.currentBalance.provenance.source === 'estimate' ? 'estimate' : 'official'
              }
              variant="body"
            />
          }
        />
        <FieldRow
          label={t('cardDetail.availableCredit')}
          value={
            <Amount
              money={available}
              provenance={availableProvenance}
              precision="estimate"
              variant="body"
            />
          }
        />

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
          value={
            details.statementBalance !== undefined ? (
              <Amount
                money={details.statementBalance.value}
                provenance={details.statementBalance.provenance}
                precision={
                  details.statementBalance.provenance.source === 'estimate' ? 'estimate' : 'official'
                }
                variant="body"
              />
            ) : (
              t('common.unknown')
            )
          }
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
          value={
            details.purchaseApr !== undefined ? (
              <View style={styles.rateRow}>
                <Text variant="body">{ratePercentLabel(details.purchaseApr)}</Text>
                <ProvenanceBadge source={details.purchaseApr.provenance.source} />
              </View>
            ) : (
              t('common.unknown')
            )
          }
        />
        <FieldRow
          label={t('cardDetail.cashAdvanceApr')}
          value={
            details.cashAdvanceApr !== undefined ? (
              <View style={styles.rateRow}>
                <Text variant="body">{ratePercentLabel(details.cashAdvanceApr)}</Text>
                <ProvenanceBadge source={details.cashAdvanceApr.provenance.source} />
              </View>
            ) : (
              t('common.unknown')
            )
          }
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
              value={
                <Amount
                  money={fee.amount.value}
                  provenance={fee.amount.provenance}
                  precision={fee.amount.provenance.source === 'estimate' ? 'estimate' : 'official'}
                  variant="body"
                />
              }
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
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
})
