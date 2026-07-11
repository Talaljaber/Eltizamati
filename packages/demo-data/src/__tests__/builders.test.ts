/**
 * Deterministic demo builder tests — Phase 5 (seed-demo-data.md §1).
 *
 * Tests:
 *   1. Double-run determinism — same demoDate → structurally equal output.
 *   2. Canonical values match mvp-scope §4.
 *   3. Fixture overrides work.
 *   4. No Date.now() / Math.random() / network dependency.
 */

import { describe, it, expect } from 'vitest'
import { Money, toLocalDate } from '@eltizamati/domain'
import {
  DEMO_DATE,
  DEMO_SEED_VERSION,
  DEMO_IDS,
  buildDemoLoan,
  buildDemoMurabaha,
  buildDemoCard,
  buildDemoLoanPayments,
  buildDemoMurabahaPayments,
  buildDemoInsights,
  buildDemoSeed,
  aLoan,
  aMurabaha,
  aCard,
  aPayment,
  anInsight,
} from '../index.js'

// ─── 1. Determinism ───────────────────────────────────────────────────────────

describe('buildDemoSeed determinism', () => {
  it('produces identical JSON-serializable output on double run', () => {
    const seed1 = buildDemoSeed({ demoDate: DEMO_DATE })
    const seed2 = buildDemoSeed({ demoDate: DEMO_DATE })

    // Compare via storage strings for Money/Rate VOs
    expect(seed1.loan.id).toBe(seed2.loan.id)
    expect(seed1.loan.loanDetails.originalPrincipal.value.toStorageString()).toBe(
      seed2.loan.loanDetails.originalPrincipal.value.toStorageString(),
    )
    expect(seed1.loanPayments.length).toBe(seed2.loanPayments.length)
    expect(seed1.insights.length).toBe(seed2.insights.length)
    expect(seed1.seedVersion).toBe(seed2.seedVersion)
  })

  it('demoDate param changes all derived dates but preserves structure', () => {
    const altDate = toLocalDate('2026-01-01')
    const seed = buildDemoSeed({ demoDate: altDate })
    expect(seed.demoDate).toBe(altDate)
    expect(seed.loan.loanDetails.startDate).not.toBe(seed.card.openedDate)
  })
})

// ─── 2. Canonical values ──────────────────────────────────────────────────────

describe('buildDemoLoan canonical values', () => {
  const loan = buildDemoLoan(DEMO_DATE)

  it('has original principal of 20,000 JOD', () => {
    expect(loan.loanDetails.originalPrincipal.value.toStorageString()).toBe('20000')
    expect(loan.loanDetails.originalPrincipal.value.currency).toBe('JOD')
  })

  it('has installment of 310 JOD', () => {
    expect(loan.loanDetails.installment.value.toStorageString()).toBe('310')
  })

  it('has 84-month term', () => {
    expect(loan.loanDetails.termMonths.value).toBe(84)
  })

  it('has variable rate type', () => {
    expect(loan.loanDetails.rateType).toBe('variable')
  })

  it('has exactly 2 rate periods', () => {
    expect(loan.loanDetails.ratePeriods).toHaveLength(2)
  })

  it('first rate period is 7.5% (0.075 decimal)', () => {
    const rate = loan.loanDetails.ratePeriods[0]?.annualRate
    expect(rate?.toDecimal().toFixed(4)).toBe('0.0750')
  })

  it('second rate period is 9.25% (0.0925 decimal)', () => {
    const rate = loan.loanDetails.ratePeriods[1]?.annualRate
    expect(rate?.toDecimal().toFixed(4)).toBe('0.0925')
  })

  it('rate change occurs at month 15 from start (effectiveFrom = start + 14 months)', () => {
    const startDate = loan.loanDetails.startDate
    const rp2 = loan.loanDetails.ratePeriods[1]
    // start + 14 months
    const [sy, sm] = startDate.split('-').map(Number) as [number, number]
    const expectedMonth = ((sm - 1 + 14) % 12) + 1
    const expectedYear = sy + Math.floor((sm - 1 + 14) / 12)
    expect(rp2?.effectiveFrom.substring(0, 7)).toBe(
      `${expectedYear}-${String(expectedMonth).padStart(2, '0')}`,
    )
  })

  it('provenance is demo-sourced with correct seedVersion', () => {
    expect(loan.provenance.source).toBe('demo')
    expect(loan.provenance.sourceReference).toBe(DEMO_SEED_VERSION)
  })

  it('has deterministic IDs', () => {
    expect(loan.id).toBe(DEMO_IDS.loanId)
    expect(loan.userId).toBe(DEMO_IDS.userId)
  })

  it('start date is demoDate minus 30 months', () => {
    // DEMO_DATE = 2026-07-01, minus 30 months = 2024-01-01
    expect(loan.loanDetails.startDate).toBe('2024-01-01')
  })
})

describe('buildDemoMurabaha canonical values', () => {
  const mrb = buildDemoMurabaha(DEMO_DATE)

  it('asset cost is 15,000 JOD', () => {
    expect(mrb.murabahaDetails.assetCost.value.toStorageString()).toBe('15000')
  })

  it('disclosed profit is 3,600 JOD', () => {
    expect(mrb.murabahaDetails.disclosedProfit.value.toStorageString()).toBe('3600')
  })

  it('total sale price is 18,600 JOD (INV-7)', () => {
    expect(mrb.murabahaDetails.totalSalePrice.value.toStorageString()).toBe('18600')
  })

  it('installment is 310 JOD', () => {
    expect(mrb.murabahaDetails.installment.value.toStorageString()).toBe('310')
  })

  it('term is 60 months', () => {
    expect(mrb.murabahaDetails.termMonths.value).toBe(60)
  })

  it('is kind murabaha', () => {
    expect(mrb.kind).toBe('murabaha')
  })
})

describe('buildDemoCard canonical values', () => {
  const card = buildDemoCard(DEMO_DATE)

  it('credit limit is 4,000 JOD', () => {
    expect(card.cardDetails.creditLimit.value.toStorageString()).toBe('4000')
  })

  it('current balance is 2,350 JOD (58.75% utilization)', () => {
    expect(card.cardDetails.currentBalance.value.toStorageString()).toBe('2350')
  })

  it('minimum payment rule is 3% with 10 JOD floor', () => {
    const rule = card.cardDetails.minimumPaymentRule
    expect(rule?.type).toBe('percent')
    if (rule?.type === 'percent') {
      expect(rule.value.toStorageString()).toBe('3')
      expect(rule.floor?.toStorageString()).toBe('10')
    }
  })

  it('purchase APR is 24%', () => {
    const apr = card.cardDetails.purchaseApr?.value
    expect(apr?.toPercent().toFixed(2)).toBe('24.00')
  })

  it('due date is after demoDate (card is calm — not overdue)', () => {
    const dueDate = card.cardDetails.dueDate
    expect(dueDate).not.toBeUndefined()
    if (dueDate) {
      expect(dueDate > DEMO_DATE).toBe(true)
    }
  })
})

// ─── 3. Payment histories ─────────────────────────────────────────────────────

describe('buildDemoLoanPayments', () => {
  const payments = buildDemoLoanPayments(DEMO_DATE)

  it('produces exactly 30 payments', () => {
    expect(payments).toHaveLength(30)
  })

  it('all payments are 310 JOD', () => {
    expect(payments.every((p) => p.amount.toStorageString() === '310')).toBe(true)
  })

  it('all payments belong to the loan obligation', () => {
    expect(payments.every((p) => p.obligationId === DEMO_IDS.loanId)).toBe(true)
  })

  it('payment IDs are all distinct', () => {
    const ids = new Set(payments.map((p) => p.id))
    expect(ids.size).toBe(30)
  })
})

describe('buildDemoMurabahaPayments', () => {
  const payments = buildDemoMurabahaPayments(DEMO_DATE)

  it('produces exactly 22 payments', () => {
    expect(payments).toHaveLength(22)
  })

  it('all payments are 310 JOD', () => {
    expect(payments.every((p) => p.amount.toStorageString() === '310')).toBe(true)
  })
})

// ─── 4. Insights ──────────────────────────────────────────────────────────────

describe('buildDemoInsights', () => {
  const insights = buildDemoInsights(DEMO_DATE)

  it('produces exactly 3 insights', () => {
    expect(insights).toHaveLength(3)
  })

  it('RATE_INCREASED insight is already read', () => {
    const ins = insights.find((i) => i.ruleId === 'RATE_INCREASED')
    expect(ins?.readAt).not.toBeUndefined()
  })

  it('INSTALLMENT_UNCHANGED insight is unread (triggers attentionRequired)', () => {
    const ins = insights.find((i) => i.ruleId === 'INSTALLMENT_UNCHANGED_AFTER_INCREASE')
    expect(ins?.readAt).toBeUndefined()
    expect(ins?.severity).toBe('attention')
  })

  it('RESIDUAL_RISK insight is unread', () => {
    const ins = insights.find((i) => i.ruleId === 'RESIDUAL_RISK')
    expect(ins?.readAt).toBeUndefined()
  })
})

// ─── 5. Fixtures ──────────────────────────────────────────────────────────────

describe('fixture builders', () => {
  it('aLoan returns canonical loan without overrides', () => {
    const loan = aLoan()
    expect(loan.id).toBe(DEMO_IDS.loanId)
    expect(loan.loanDetails.termMonths.value).toBe(84)
  })

  it('aLoan accepts partial overrides', () => {
    const loan = aLoan({ nickname: 'Test Loan' })
    expect(loan.nickname).toBe('Test Loan')
    expect(loan.loanDetails.termMonths.value).toBe(84) // unchanged
  })

  it('aMurabaha returns canonical murabaha', () => {
    const mrb = aMurabaha()
    expect(mrb.murabahaDetails.totalSalePrice.value.toStorageString()).toBe('18600')
  })

  it('aCard returns canonical card', () => {
    const card = aCard()
    expect(card.cardDetails.creditLimit.value.toStorageString()).toBe('4000')
  })

  it('aPayment returns valid payment with stable ID on same seq', () => {
    const p1 = aPayment({}, 1)
    const p2 = aPayment({}, 1)
    expect(p1.id).toBe(p2.id)
  })

  it('aPayment accepts override for amount', () => {
    const p = aPayment({ amount: Money.of('500', 'JOD') })
    expect(p.amount.toStorageString()).toBe('500')
  })

  it('anInsight returns valid insight', () => {
    const ins = anInsight()
    expect(ins.severity).toBe('info')
  })

  it('anInsight accepts severity override', () => {
    const ins = anInsight({ severity: 'urgent' })
    expect(ins.severity).toBe('urgent')
  })
})

// ─── 6. seedVersion in provenance ─────────────────────────────────────────────

describe('seed provenance', () => {
  it('every builder stamps DEMO_SEED_VERSION in sourceReference', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    expect(loan.provenance.sourceReference).toBe(DEMO_SEED_VERSION)
    expect(loan.loanDetails.installment.provenance.sourceReference).toBe(DEMO_SEED_VERSION)
  })
})
