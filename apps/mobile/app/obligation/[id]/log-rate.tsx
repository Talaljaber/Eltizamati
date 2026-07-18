import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  Amount,
  Text,
  Button,
  TextField,
  SkeletonCard,
  InlineState,
  space,
} from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { Rate, localDateFromDate, toLocalDate, type Id } from '@eltizamati/domain'
import { RateWhatIfService } from '@/services/rate-what-if-service'
import type { RateChangeScenarioResult } from '@eltizamati/finance-engine'
import { isValidDecimal, isValidLocalDate } from '@/features/obligation-form/validation'
import { DatePickerField } from '@/features/obligation-form/components/DatePickerField'

const service = new RateWhatIfService()

export default function LogRateChangeScreen() {
  return (
    <RequireRepositories>
      <LogRateChangeInner />
    </RequireRepositories>
  )
}

function LogRateChangeInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const { id } = useLocalSearchParams<{ id: string }>()
  const obligationId = id as Id<'obligation'>

  const { data: obligation, isLoading } = useQuery({
    queryKey: ['obligation', activeUser ?? '', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [annualRatePercent, setAnnualRatePercent] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<RateChangeScenarioResult | undefined>()
  const [resultAsOf, setResultAsOf] = useState<string | undefined>()
  const scenarioProvenance = {
    source: 'estimate' as const,
    providerId: 'rate-what-if',
    observedAt: `${resultAsOf ?? '1970-01-01'}T00:00:00.000Z`,
    recordedAt: `${resultAsOf ?? '1970-01-01'}T00:00:00.000Z`,
  }

  function clearResult() {
    setResult(undefined)
    setResultAsOf(undefined)
    setError(undefined)
  }

  function handleEffectiveFromChange(value: string) {
    clearResult()
    setEffectiveFrom(value)
  }

  function handleRateChange(value: string) {
    clearResult()
    setAnnualRatePercent(value)
  }

  async function handleCalculate() {
    if (!obligation || obligation.kind !== 'conventionalLoan') return
    if (!isValidLocalDate(effectiveFrom)) return setError(t('obligationForm.errors.date'))
    if (!isValidDecimal(annualRatePercent)) return setError(t('obligationForm.errors.percent'))
    let hypotheticalRate: Rate
    try {
      hypotheticalRate = Rate.fromPercent(annualRatePercent)
    } catch {
      return setError(t('obligationForm.errors.percent'))
    }
    const asOf = localDateFromDate(new Date())
    setError(undefined)
    setCalculating(true)
    const calculation = service.calculate(
      obligation,
      hypotheticalRate,
      toLocalDate(effectiveFrom),
      asOf,
    )
    setCalculating(false)
    if (!calculation.ok) {
      const reason = calculation.error.safeMetadata?.reason
      return setError(
        reason === 'duplicateEffectiveFrom'
          ? t('obligationForm.errors.rateOverlap')
          : reason === 'outsideLoanTerm'
            ? t('obligationForm.errors.rateEffectiveDateOutsideTerm')
            : t('error.calculationRefused'),
      )
    }
    setResult(calculation.value)
    setResultAsOf(asOf)
  }

  if (isLoading || !obligation) {
    return (
      <View style={styles.loading}>
        <SkeletonCard />
      </View>
    )
  }

  if (obligation.kind !== 'conventionalLoan') {
    return (
      <View style={styles.loading}>
        <InlineState kind="unsupported" message={t('obligationForm.rateChangeNotApplicable')} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('obligationForm.rateWhatIfTitle') }} />
      <InlineState kind="empty" message={t('obligationForm.rateWhatIfNotice')} />
      <DatePickerField
        label={t('obligationForm.rateEffectiveFrom')}
        value={effectiveFrom}
        onChange={handleEffectiveFromChange}
      />
      <TextField
        label={t('obligationForm.annualRatePercent')}
        value={annualRatePercent}
        onChangeText={handleRateChange}
        keyboardType="decimal-pad"
      />

      {error !== undefined && (
        <Text variant="bodySmall" color="critical">
          {error}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={() => router.back()}
          disabled={calculating}
        />
        <Button
          label={t('obligationForm.calculate')}
          onPress={() => void handleCalculate()}
          loading={calculating}
        />
      </View>
      {result !== undefined && (
        <View style={styles.result}>
          <Text variant="heading">{t('obligationForm.rateWhatIfResult')}</Text>
          <Text variant="bodySmall">{t('obligationForm.outstandingUnchanged')}</Text>
          {obligation.loanDetails.outstandingBalance !== undefined && (
            <Amount
              money={obligation.loanDetails.outstandingBalance.value}
              provenance={obligation.loanDetails.outstandingBalance.provenance}
            />
          )}
          <Text variant="bodySmall">{t('obligationForm.installmentUnchanged')}</Text>
          <Amount
            money={result.installment}
            provenance={obligation.loanDetails.installment.provenance}
          />
          <Text variant="bodySmall">{t('obligationForm.projectedTotalBaseline')}</Text>
          <Amount
            money={result.baseline.projectedTotalStillPayable}
            provenance={scenarioProvenance}
            precision="estimate"
          />
          <Text variant="bodySmall">{t('obligationForm.projectedTotalWhatIf')}</Text>
          <Amount
            money={result.hypothetical.projectedTotalStillPayable}
            provenance={scenarioProvenance}
            precision="estimate"
          />
          <Text variant="bodySmall">{t('obligationForm.projectedResidualWhatIf')}</Text>
          <Amount
            money={result.hypothetical.projectedResidualAtMaturity}
            provenance={scenarioProvenance}
            precision="estimate"
          />
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[8],
  },
  loading: {
    flex: 1,
    padding: space[4],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[3],
  },
  result: { gap: space[2] },
})
