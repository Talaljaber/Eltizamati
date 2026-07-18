import { ScrollView, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Money, engineEstimate, type CanonicalJsonValue, type Id } from '@eltizamati/domain'
import {
  Amount,
  Button,
  Card,
  FieldRow,
  InlineState,
  Text,
  TextField,
  space,
  layout,
  useResponsiveLayout,
} from '@/core/design-system'
import { useCardPayoffSimulator } from '@/features/card-simulator/hooks/use-card-payoff-simulator'
import {
  snapshotMoneyAmount,
  snapshotNumber,
  snapshotRecord,
} from '@/services/calculation-snapshot'

export default function CardSimulatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const vm = useCardPayoffSimulator(id as Id<'obligation'>)
  const { isWideWeb } = useResponsiveLayout()

  const snapshot =
    vm.run?.outcome.kind === 'result' ? snapshotRecord(vm.run.outcome.resultSnapshot) : undefined
  const minimum = snapshotRecord(snapshot?.minimumOnly)
  const fixed = snapshotRecord(snapshot?.fixedPayment)

  function amount(value: CanonicalJsonValue | undefined) {
    const raw = snapshotMoneyAmount(value)
    if (raw === undefined || vm.run === undefined) return t('common.unknown')
    const money = Money.of(raw, vm.obligation?.currency ?? 'JOD')
    return (
      <Amount
        money={money}
        provenance={engineEstimate(money, vm.run.id, vm.run.calculatedAt).provenance}
        precision="estimate"
      />
    )
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, isWideWeb && styles.contentWide]}>
      <Stack.Screen options={{ title: t('cardSimulator.title') }} />
      {vm.loading && <InlineState kind="loading" message={t('common.loading')} />}
      {vm.loadError && <InlineState kind="error" message={t('cardSimulator.loadError')} />}
      {vm.obligation?.kind === 'creditCard' && (
        <>
          <Card>
            <Text variant="heading">{t('cardSimulator.inputTitle')}</Text>
            <TextField
              label={t('cardSimulator.fixedPayment')}
              value={vm.paymentAmount}
              onChangeText={vm.setPaymentAmount}
              keyboardType="decimal-pad"
            />
            <Button
              label={t('cardSimulator.calculate')}
              onPress={() => void vm.calculate()}
              loading={vm.status === 'calculating'}
            />
            <Text variant="caption" color="secondary">
              {t('cardSimulator.assumption')}
            </Text>
          </Card>

          {vm.status === 'refused' && (
            <InlineState kind="refused" message={t('cardSimulator.missingData')} />
          )}
          {vm.status === 'invalid' && (
            <InlineState kind="error" message={t('cardSimulator.invalidPayment')} />
          )}
          {vm.status === 'error' && <InlineState kind="error" message={t('cardSimulator.error')} />}
          {vm.status === 'success' && snapshot !== undefined && (
            <View style={styles.results}>
              <Card>
                <Text variant="heading">{t('cardSimulator.minimumOnly')}</Text>
                <FieldRow
                  label={t('cardSimulator.months')}
                  value={String(snapshotNumber(minimum.months) ?? t('common.unknown'))}
                />
                <FieldRow
                  label={t('cardSimulator.totalCharges')}
                  value={amount(minimum.totalCharges)}
                />
                <FieldRow label={t('cardSimulator.totalPaid')} value={amount(minimum.totalPaid)} />
                {minimum.neverPaysOff === true && (
                  <Text color="critical">{t('cardSimulator.neverPaysOff')}</Text>
                )}
              </Card>
              {Object.keys(fixed).length > 0 && (
                <Card>
                  <Text variant="heading">{t('cardSimulator.fixedStrategy')}</Text>
                  <FieldRow
                    label={t('cardSimulator.months')}
                    value={String(snapshotNumber(fixed.months) ?? t('common.unknown'))}
                  />
                  <FieldRow
                    label={t('cardSimulator.totalCharges')}
                    value={amount(fixed.totalCharges)}
                  />
                  <FieldRow label={t('cardSimulator.totalPaid')} value={amount(fixed.totalPaid)} />
                  {fixed.neverPaysOff === true && (
                    <Text color="critical">{t('cardSimulator.neverPaysOff')}</Text>
                  )}
                </Card>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4], paddingBottom: space[8] },
  contentWide: { width: '100%', maxWidth: layout.readableMaxWidth, alignSelf: 'center' },
  results: { gap: space[4] },
})
