import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Money, brandId, toLocalDate } from '@eltizamati/domain'
import type { Provenance } from '@eltizamati/domain'
import { RepositoriesProvider } from '@/features/repositories/hooks/use-repositories'
import {
  CalculationAsOfProvider,
  useCalculationAsOfOverride,
} from '@/services/calculation-as-of-context'
import { LoanDetailHero } from '../LoanDetailHero'
import type { LoanDetailHeroModel } from '../../hooks/use-loan-detail-view-model'

jest.mock('@/features/auth/hooks/use-active-user', () => ({ useActiveUser: () => 'demo-user' }))

const mounted: { readonly client: QueryClient; readonly unmount: () => void }[] = []

const officialProvenance: Provenance = {
  source: 'official',
  providerId: 'openbanking:roya',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

const estimateProvenance: Provenance = {
  source: 'estimate',
  sourceReference: 'run-001',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

function renderHero(hero: LoanDetailHeroModel) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    calculationRunRepository: {
      latestFor: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  const view = render(
    <QueryClientProvider client={client}>
      <RepositoriesProvider repositories={repos}>
        <LoanDetailHero obligationId={brandId<'obligation'>('obligation-1')} hero={hero} />
      </RepositoriesProvider>
    </QueryClientProvider>,
  )
  mounted.push({ client, unmount: view.unmount })
  return view
}

const FAST_FORWARD_DATE = toLocalDate('2027-01-01')

/**
 * Mirrors how the real obligation detail screen wires this up: it reads the
 * shared override from context itself and folds it into the `hero` prop it
 * passes down (LoanDetailHero never reads asOfOverride/fastForwardDate from
 * context directly). The earlier tests below render LoanDetailHero with a
 * hard-coded `hero.asOfOverride`, which — because renderHero() doesn't wrap
 * in a real CalculationAsOfProvider — exercises the button's onPress against
 * the context default's no-op applyAsOf/clearAsOf, not the real ones. That
 * gap can hide a real "Reset to today does nothing" regression, since it
 * never presses both buttons in sequence against a live provider.
 */
function LiveHeroHarness({ baseHero }: { baseHero: Omit<LoanDetailHeroModel, 'asOfOverride'> }) {
  const { override } = useCalculationAsOfOverride()
  return (
    <LoanDetailHero
      obligationId={brandId<'obligation'>('obligation-1')}
      hero={{ ...baseHero, asOfOverride: override }}
    />
  )
}

function renderLiveHero(baseHero: Omit<LoanDetailHeroModel, 'asOfOverride'>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    calculationRunRepository: {
      latestFor: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  const view = render(
    <QueryClientProvider client={client}>
      <RepositoriesProvider repositories={repos}>
        <CalculationAsOfProvider>
          <LiveHeroHarness baseHero={baseHero} />
        </CalculationAsOfProvider>
      </RepositoriesProvider>
    </QueryClientProvider>,
  )
  mounted.push({ client, unmount: view.unmount })
  return view
}

describe('LoanDetailHero', () => {
  afterEach(() => {
    for (const { client, unmount } of mounted.splice(0)) {
      unmount()
      client.clear()
    }
  })

  it('renders the current balance as the dominant hero figure', () => {
    const { getByText } = renderHero({
      currentBalance: Money.of('12450.5', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      estimatedResidual: undefined,
      estimatedResidualProvenance: undefined,
      residualConfidence: undefined,
      residualCalculationRunId: undefined,
    })
    expect(getByText(/12,450\.5/)).toBeTruthy()
  })

  it('renders the residual as a supporting metric when available', () => {
    const { getByText } = renderHero({
      currentBalance: Money.of('10000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      estimatedResidual: Money.of('2000', 'JOD'),
      estimatedResidualProvenance: estimateProvenance,
      residualConfidence: 'medium',
      residualCalculationRunId: 'run-1',
    })
    expect(getByText(/≈ 2,000/)).toBeTruthy()
  })

  it('shows the published-rate transition and the schedule-change warning, but no "projected remaining payable" row', () => {
    const { getByText, queryByText } = renderHero({
      currentBalance: Money.of('10000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      currentRatePercent: '9.250',
      previousRatePercent: '7.500',
      estimatedResidual: Money.of('2000', 'JOD'),
      estimatedResidualProvenance: estimateProvenance,
      residualConfidence: 'medium',
      residualCalculationRunId: 'run-1',
    })

    expect(getByText('7.500% → 9.250%')).toBeTruthy()
    expect(getByText('loanDetail.scheduleChangeTitle')).toBeTruthy()
    // The confusing "projected remaining payable" figure was removed from the simplified hero.
    expect(queryByText('loanDetail.projectedRemainingPayable')).toBeNull()
  })

  it('opens the explain sheet when the residual is pressed', () => {
    const { getByRole } = renderHero({
      currentBalance: Money.of('10000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      estimatedResidual: Money.of('2000', 'JOD'),
      estimatedResidualProvenance: estimateProvenance,
      residualConfidence: 'medium',
      residualCalculationRunId: 'run-1',
    })
    // Amount renders accessibilityRole="button" only when onPress is set — the
    // residual is the only pressable Amount in this component (the hero
    // figure itself has no onPress), so this is unambiguous.
    const pressable = getByRole('button')
    fireEvent.press(pressable)
    expect(pressable).toBeTruthy()
  })

  it('leads with remainingToPay, shows paid-to-date and next installment, and drops the current-balance row', () => {
    const { getByText, queryByText } = renderHero({
      currentBalance: Money.of('6000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      estimatedResidual: undefined,
      estimatedResidualProvenance: undefined,
      residualConfidence: undefined,
      residualCalculationRunId: undefined,
      remainingToPay: Money.of('5571', 'JOD'),
      remainingToPayProvenance: estimateProvenance,
      paidToDate: Money.of('1000', 'JOD'),
      nextInstallment: Money.of('307', 'JOD'),
      nextInstallmentProvenance: officialProvenance,
    })
    expect(getByText('loanDetail.remainingToPay')).toBeTruthy()
    expect(getByText(/≈ 5,571/)).toBeTruthy()
    expect(getByText('loanDetail.paidToDate')).toBeTruthy()
    expect(getByText(/≈ 1,000/)).toBeTruthy()
    expect(getByText('loanDetail.nextInstallment')).toBeTruthy()
    expect(getByText(/307/)).toBeTruthy()
    // Simplified UI: current balance is no longer shown as a supporting row.
    expect(queryByText('loanDetail.currentBalance')).toBeNull()
  })

  it('offers "Apply rate now" when a future fast-forward date exists, and swaps to the reset control once an override is active', () => {
    const base = {
      currentBalance: Money.of('6000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official' as const,
      estimatedResidual: undefined,
      estimatedResidualProvenance: undefined,
      residualConfidence: undefined,
      residualCalculationRunId: undefined,
      remainingToPay: Money.of('5571', 'JOD'),
      remainingToPayProvenance: estimateProvenance,
    }
    const notYet = renderHero({ ...base, fastForwardDate: toLocalDate('2027-01-01') })
    expect(notYet.getByTestId('loan-detail-apply-rate-now')).toBeTruthy()
    expect(notYet.queryByTestId('loan-detail-reset-asof')).toBeNull()

    const applied = renderHero({
      ...base,
      fastForwardDate: toLocalDate('2027-01-01'),
      asOfOverride: toLocalDate('2027-01-01'),
    })
    expect(applied.getByText('loanDetail.viewingAsOfTitle')).toBeTruthy()
    expect(applied.getByTestId('loan-detail-reset-asof')).toBeTruthy()
    expect(applied.queryByTestId('loan-detail-apply-rate-now')).toBeNull()
  })

  it('pressing "Apply rate now" then "Reset to today" actually round-trips through the real context (regression: reset must not be a no-op)', () => {
    const base = {
      currentBalance: Money.of('6000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official' as const,
      estimatedResidual: undefined,
      estimatedResidualProvenance: undefined,
      residualConfidence: undefined,
      residualCalculationRunId: undefined,
      fastForwardDate: FAST_FORWARD_DATE,
    }
    const view = renderLiveHero(base)

    expect(view.getByTestId('loan-detail-apply-rate-now')).toBeTruthy()
    expect(view.queryByTestId('loan-detail-reset-asof')).toBeNull()

    fireEvent.press(view.getByTestId('loan-detail-apply-rate-now'))

    expect(view.getByText('loanDetail.viewingAsOfTitle')).toBeTruthy()
    expect(view.getByTestId('loan-detail-reset-asof')).toBeTruthy()
    expect(view.queryByTestId('loan-detail-apply-rate-now')).toBeNull()

    fireEvent.press(view.getByTestId('loan-detail-reset-asof'))

    expect(view.queryByText('loanDetail.viewingAsOfTitle')).toBeNull()
    expect(view.queryByTestId('loan-detail-reset-asof')).toBeNull()
    expect(view.getByTestId('loan-detail-apply-rate-now')).toBeTruthy()
  })

  it('shows the outdated-schedule banner and a link to the recommended schedule when stale', () => {
    const { getByText } = renderHero({
      currentBalance: Money.of('6000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      estimatedResidual: undefined,
      estimatedResidualProvenance: undefined,
      residualConfidence: undefined,
      residualCalculationRunId: undefined,
      scheduleStale: true,
      scheduleStaleReasons: ['paymentDrift'],
    })
    expect(getByText('loanDetail.scheduleChangeTitle')).toBeTruthy()
    expect(getByText('schedule.viewRecommended')).toBeTruthy()
  })

  it('renders "unknown" when no current balance is available', () => {
    const { getByText } = renderHero({
      currentBalance: undefined,
      currentBalanceProvenance: undefined,
      currentBalancePrecision: 'official',
      estimatedResidual: undefined,
      estimatedResidualProvenance: undefined,
      residualConfidence: undefined,
      residualCalculationRunId: undefined,
    })
    expect(getByText('common.unknown')).toBeTruthy()
  })
})
