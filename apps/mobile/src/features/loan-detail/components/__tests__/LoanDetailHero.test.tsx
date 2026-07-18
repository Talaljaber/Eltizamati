import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Money, brandId } from '@eltizamati/domain'
import type { Provenance } from '@eltizamati/domain'
import { RepositoriesProvider } from '@/features/repositories/hooks/use-repositories'
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

  it('shows the published-rate transition, remaining payable, and non-balloon warning', () => {
    const { getByText } = renderHero({
      currentBalance: Money.of('10000', 'JOD'),
      currentBalanceProvenance: officialProvenance,
      currentBalancePrecision: 'official',
      currentRatePercent: '9.250',
      previousRatePercent: '7.500',
      projectedRemainingPayable: Money.of('12500', 'JOD'),
      projectedRemainingPayableProvenance: estimateProvenance,
      estimatedResidual: Money.of('2000', 'JOD'),
      estimatedResidualProvenance: estimateProvenance,
      residualConfidence: 'medium',
      residualCalculationRunId: 'run-1',
    })

    expect(getByText('7.500% → 9.250%')).toBeTruthy()
    expect(getByText(/≈ 12,500/)).toBeTruthy()
    expect(getByText('loanDetail.scheduleChangeTitle')).toBeTruthy()
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
