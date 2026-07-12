import { describe, expect, it } from 'vitest'
import { buildDemoSeed, DEMO_DATE } from '@eltizamati/demo-data'
import { Money, resolveMinimumPaymentDue } from '@eltizamati/domain'
import { aggregates, computeAggregates, type ObligationBalanceItem } from './aggregates.js'
import { computeVariableProjection } from './variable-projection.js'
import { computeMurabahaProgress } from './murabaha-progress.js'
import { isEngineOk, isRefused } from '../refusal.js'
import { loadVectorFamily } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-7xx-aggregates.json')

describe('aggregates.v1 — TV-701 (demo seed set)', () => {
  it('sums outstanding across kinds, labels includesEstimates, excludes nothing', () => {
    const vector = vectors.find((v) => v.id === 'TV-701')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const expected = vector.expected as {
      totalMonthlyCommitment: string
      includesEstimates: boolean
      excludedCount: number
    }
    const seed = buildDemoSeed({ demoDate: DEMO_DATE })

    const loanProjection = computeVariableProjection(
      seed.loan.loanDetails.originalPrincipal.value,
      seed.loan.loanDetails.ratePeriods,
      seed.loan.loanDetails.termMonths.value,
      seed.loan.loanDetails.startDate,
      seed.loan.loanDetails.installment.value,
      { kind: 'unchanged' },
      DEMO_DATE,
    )
    const loanOutstanding = loanProjection.outstandingAsOf

    const paidSum = seed.murabahaPayments.reduce((acc, p) => acc.add(p.amount), Money.zero('JOD'))
    const murabahaProgress = computeMurabahaProgress(
      seed.murabaha.murabahaDetails.totalSalePrice.value,
      paidSum,
      DEMO_DATE,
    )

    const balances: readonly ObligationBalanceItem[] = [
      {
        obligationId: seed.loan.id,
        nickname: seed.loan.nickname,
        balance: loanOutstanding,
        isEstimate: true,
      },
      {
        obligationId: seed.murabaha.id,
        nickname: seed.murabaha.nickname,
        balance: murabahaProgress.outstanding,
        isEstimate: false,
      },
      {
        obligationId: seed.card.id,
        nickname: seed.card.nickname,
        balance: seed.card.cardDetails.currentBalance.value,
        isEstimate: false,
      },
    ]

    const cardMinimum = resolveMinimumPaymentDue(
      seed.card.cardDetails.minimumPaymentRule ?? { type: 'unknown' },
      seed.card.cardDetails.currentBalance.value,
    )
    const cardCommitment = cardMinimum.kind === 'known' ? cardMinimum.amount : undefined

    const commitments = [
      {
        obligationId: seed.loan.id,
        nickname: seed.loan.nickname,
        monthlyCommitment: seed.loan.loanDetails.installment.value,
        isEstimate: false,
      },
      {
        obligationId: seed.murabaha.id,
        nickname: seed.murabaha.nickname,
        monthlyCommitment: seed.murabaha.murabahaDetails.installment.value,
        isEstimate: false,
      },
      {
        obligationId: seed.card.id,
        nickname: seed.card.nickname,
        ...(cardCommitment !== undefined ? { monthlyCommitment: cardCommitment } : {}),
        isEstimate: false,
      },
    ]

    const result = computeAggregates(balances, commitments, 'JOD', DEMO_DATE)

    const expectedOutstanding = loanOutstanding
      .add(murabahaProgress.outstanding)
      .add(seed.card.cardDetails.currentBalance.value)
    expect(result.totalOutstanding.equals(expectedOutstanding)).toBe(true)
    expect(
      result.totalMonthlyCommitment.equals(Money.of(expected.totalMonthlyCommitment, 'JOD')),
    ).toBe(true)
    expect(result.includesEstimates).toBe(expected.includesEstimates)
    expect(result.excludedFromOutstanding).toHaveLength(expected.excludedCount)
    expect(result.excludedFromCommitment).toHaveLength(expected.excludedCount)
  })
})

describe('aggregates.v1 — TV-702 (missing balance excluded and named, BR-PROV-005)', () => {
  it('excludes the obligation lacking any balance and names it', () => {
    const vector = vectors.find((v) => v.id === 'TV-702')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const inputs = vector.inputs as {
      balances: readonly {
        obligationId: string
        nickname: string
        balance: string | null
        isEstimate: boolean
      }[]
    }
    const expected = vector.expected as {
      totalOutstanding: string
      excludedFromOutstanding: readonly { obligationId: string; nickname: string }[]
    }

    const balances: readonly ObligationBalanceItem[] = inputs.balances.map((b) => ({
      obligationId: b.obligationId,
      nickname: b.nickname,
      ...(b.balance !== null ? { balance: Money.of(b.balance, 'JOD') } : {}),
      isEstimate: b.isEstimate,
    }))

    const result = computeAggregates(balances, [], 'JOD', DEMO_DATE)

    expect(result.totalOutstanding.equals(Money.of(expected.totalOutstanding, 'JOD'))).toBe(true)
    expect(result.excludedFromOutstanding).toEqual(expected.excludedFromOutstanding)
  })
})

describe('aggregates.v1 — excluded commitments (BR-PROV-005, commitment side)', () => {
  it('excludes an obligation lacking a known monthly commitment and names it', () => {
    const result = computeAggregates(
      [],
      [
        {
          obligationId: 'obl-1',
          nickname: 'Personal Loan',
          monthlyCommitment: Money.of('310', 'JOD'),
          isEstimate: false,
        },
        { obligationId: 'obl-2', nickname: 'Unknown-rule Card', isEstimate: false },
      ],
      'JOD',
      DEMO_DATE,
    )
    expect(result.totalMonthlyCommitment.equals(Money.of('310', 'JOD'))).toBe(true)
    expect(result.excludedFromCommitment).toEqual([
      { obligationId: 'obl-2', nickname: 'Unknown-rule Card' },
    ])
  })
})

describe('aggregates — engine refusal (BR-CALC-016)', () => {
  it('refuses when balances/commitments/currency are missing', () => {
    const outcome = aggregates({ asOf: DEMO_DATE })
    expect(isRefused(outcome)).toBe(true)
  })

  it('succeeds with an empty portfolio', () => {
    const outcome = aggregates({ balances: [], commitments: [], currency: 'JOD', asOf: DEMO_DATE })
    expect(isEngineOk(outcome)).toBe(true)
    if (isEngineOk(outcome)) {
      expect(outcome.value.totalOutstanding.isZero()).toBe(true)
      expect(outcome.value.includesEstimates).toBe(false)
    }
  })
})
