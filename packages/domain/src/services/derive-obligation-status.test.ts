/**
 * BR-STAT-001 precedence chain — domain-model.md §4. Test names cite the rule
 * being exercised. See PHASE-02-DECISION-LOG.md §13 for the documented
 * heuristics behind the delinquent/overdue due-date cadence and the
 * calculationIncomplete insight-signaling mechanism.
 */
import { describe, it, expect } from 'vitest'
import {
  deriveObligationStatus,
  getNextDueInfo,
  resolveMonthlyCommitment,
  extractOfficialBalance,
} from './derive-obligation-status.js'
import { CALCULATION_REFUSED_INSIGHT_RULE_ID } from '../constants.js'
import { Money, Rate } from '../value-objects/money.js'
import { Percentage } from '../value-objects/percentage.js'
import { brandId, toLocalDate, type LocalDate } from '../value-objects/id.js'
import type { Provenance, Sourced } from '../value-objects/provenance.js'
import type {
  ConventionalLoan,
  ConventionalLoanDetails,
  CreditCard,
  CardDetails,
  MurabahaFinancing,
  MurabahaDetails,
} from '../entities/obligation.js'
import type { Payment } from '../entities/payment.js'
import type { Insight } from '../entities/insight.js'
import type { RatePeriod } from '../entities/rate-period.js'

const userId = brandId<'user'>('user-1')
const iso = '2026-01-01T00:00:00.000Z'

function demoProvenance(
  source: Provenance['source'] = 'demo',
  observedAt = '2026-01-01',
): Provenance {
  return { source, observedAt, recordedAt: observedAt }
}

function sourced<T>(value: T, source: Provenance['source'] = 'demo'): Sourced<T> {
  return { value, provenance: demoProvenance(source) }
}

function ratePeriod(obligationId: string, effectiveFrom: string): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(`rp-${effectiveFrom}`),
    obligationId: brandId<'obligation'>(obligationId),
    annualRate: Rate.fromPercent('7.5'),
    effectiveFrom: toLocalDate(effectiveFrom),
    provenance: demoProvenance(),
    createdAt: iso,
  }
}

function loan(
  loanOverrides: Partial<ConventionalLoanDetails> = {},
  baseOverrides: Partial<ConventionalLoan> = {},
): ConventionalLoan {
  const id = brandId<'obligation'>('obl-loan')
  return {
    id,
    userId,
    kind: 'conventionalLoan',
    nickname: 'Test Loan',
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2024-01-15'),
    provenance: demoProvenance(),
    createdAt: iso,
    updatedAt: iso,
    ...baseOverrides,
    loanDetails: {
      originalPrincipal: sourced(Money.of('20000')),
      installment: sourced(Money.of('307')),
      rateType: 'fixed',
      ratePeriods: [ratePeriod('obl-loan', '2024-01-15')],
      termMonths: sourced(84),
      startDate: toLocalDate('2024-01-15'),
      maturityDate: toLocalDate('2031-01-15'),
      paymentFrequency: 'monthly',
      ...loanOverrides,
    },
  }
}

function murabaha(
  murabahaOverrides: Partial<MurabahaDetails> = {},
  baseOverrides: Partial<MurabahaFinancing> = {},
): MurabahaFinancing {
  const id = brandId<'obligation'>('obl-murabaha')
  return {
    id,
    userId,
    kind: 'murabaha',
    nickname: 'Test Murabaha',
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2024-01-15'),
    provenance: demoProvenance(),
    createdAt: iso,
    updatedAt: iso,
    ...baseOverrides,
    murabahaDetails: {
      assetCost: sourced(Money.of('15000')),
      disclosedProfit: sourced(Money.of('3600')),
      totalSalePrice: sourced(Money.of('18600')),
      installment: sourced(Money.of('221.4286')),
      termMonths: sourced(84),
      startDate: toLocalDate('2024-01-15'),
      ...murabahaOverrides,
    },
  }
}

function card(
  cardOverrides: Partial<CardDetails> = {},
  baseOverrides: Partial<CreditCard> = {},
): CreditCard {
  const id = brandId<'obligation'>('obl-card')
  return {
    id,
    userId,
    kind: 'creditCard',
    nickname: 'Test Card',
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2024-01-15'),
    provenance: demoProvenance(),
    createdAt: iso,
    updatedAt: iso,
    ...baseOverrides,
    cardDetails: {
      creditLimit: sourced(Money.of('3000')),
      currentBalance: sourced(Money.of('2350')),
      ...cardOverrides,
    },
  }
}

function payment(obligationId: string, date: string, amount = '307'): Payment {
  return {
    id: brandId<'payment'>(`pay-${obligationId}-${date}`),
    obligationId: brandId<'obligation'>(obligationId),
    userId,
    date: toLocalDate(date),
    amount: Money.of(amount),
    provenance: demoProvenance(),
    createdAt: `${date}T00:00:00.000Z`,
  }
}

function insight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: brandId<'insight'>('insight-1'),
    userId,
    ruleId: 'test.rule',
    severity: 'info',
    titleKey: 'insight.title',
    bodyKey: 'insight.body',
    triggerHash: 'hash-1',
    createdAt: iso,
    ...overrides,
  }
}

const TODAY: LocalDate = toLocalDate('2026-07-01') // canonical DEMO_DATE

describe('deriveObligationStatus', () => {
  it('BR-STAT-001: completed takes precedence when closedDate is set', () => {
    const obligation = loan({}, { closedDate: toLocalDate('2026-06-01') })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('completed')
  })

  it('BR-STAT-001: completed when the official outstanding balance is zero', () => {
    const obligation = loan({ outstandingBalance: sourced(Money.of('0'), 'userEntered') })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('completed')
  })

  it('BR-STAT-001: an estimated zero balance does NOT count as officially completed', () => {
    // If the estimate were wrongly treated as official, this would resolve as
    // `completed`; instead it must fall through to `notStarted` on the
    // (genuinely future) start date.
    const obligation = loan({
      outstandingBalance: sourced(Money.of('0'), 'estimate'),
      startDate: toLocalDate('2030-01-01'),
    })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('notStarted')
  })

  it('BR-STAT-001: Murabaha completed when payments sum to the total sale price (INV-7)', () => {
    const obligation = murabaha({ totalSalePrice: sourced(Money.of('1000')) })
    const payments = [payment('obl-murabaha', '2026-01-01', '1000')]
    const status = deriveObligationStatus({ obligation, payments, insights: [], today: TODAY })
    expect(status).toBe('completed')
  })

  it('BR-STAT-001: notStarted when startDate is after today', () => {
    const obligation = loan({ startDate: toLocalDate('2027-01-01') })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('notStarted')
  })

  it('BR-STAT-003: delinquent when 2 consecutive due periods are unpaid', () => {
    // Loan due monthly from 2026-02-15 (startDate 2026-01-15 + 1mo); today 2026-07-01
    // means periods 2026-02-15..2026-06-15 are due. Leave the last two unpaid.
    // Payments land exactly on their due date — a payment must fall on/before
    // a due date to satisfy that period's (previousDue, due] window.
    const obligation = loan({ startDate: toLocalDate('2026-01-15') })
    const payments = [
      payment('obl-loan', '2026-02-15'),
      payment('obl-loan', '2026-03-15'),
      payment('obl-loan', '2026-04-15'),
      // 2026-05-15 and 2026-06-15 periods unpaid
    ]
    const status = deriveObligationStatus({ obligation, payments, insights: [], today: TODAY })
    expect(status).toBe('delinquent')
  })

  it('BR-STAT-001: overdue when only the most recent due period is unpaid, past the grace window', () => {
    const obligation = loan({ startDate: toLocalDate('2026-01-15') })
    const payments = [
      payment('obl-loan', '2026-02-15'),
      payment('obl-loan', '2026-03-15'),
      payment('obl-loan', '2026-04-15'),
      payment('obl-loan', '2026-05-15'),
      // only 2026-06-15 unpaid — today (2026-07-01) is 16 days past it, beyond the 3-day grace
    ]
    const status = deriveObligationStatus({ obligation, payments, insights: [], today: TODAY })
    expect(status).toBe('overdue')
  })

  it('BR-STAT-001: delinquent takes precedence over attentionRequired (precedence order)', () => {
    const obligation = loan({ startDate: toLocalDate('2026-01-15') })
    const payments = [payment('obl-loan', '2026-02-15')] // periods 03-15..06-15 unpaid — a delinquent streak
    const insights = [insight({ obligationId: obligation.id, severity: 'attention' })]
    const status = deriveObligationStatus({ obligation, payments, insights, today: TODAY })
    expect(status).toBe('delinquent')
  })

  it('BR-STAT-001: attentionRequired when an unresolved attention-severity insight exists', () => {
    const obligation = card()
    const insights = [insight({ obligationId: obligation.id, severity: 'attention' })]
    const status = deriveObligationStatus({ obligation, payments: [], insights, today: TODAY })
    expect(status).toBe('attentionRequired')
  })

  it('BR-STAT-001: a read attention insight does not trigger attentionRequired', () => {
    const obligation = card()
    const insights = [insight({ obligationId: obligation.id, severity: 'attention', readAt: iso })]
    const status = deriveObligationStatus({ obligation, payments: [], insights, today: TODAY })
    expect(status).not.toBe('attentionRequired')
  })

  it('BR-CALC-016: calculationIncomplete when the engine-refused insight is present', () => {
    const obligation = card()
    const insights = [
      insight({ obligationId: obligation.id, ruleId: CALCULATION_REFUSED_INSIGHT_RULE_ID }),
    ]
    const status = deriveObligationStatus({ obligation, payments: [], insights, today: TODAY })
    expect(status).toBe('calculationIncomplete')
  })

  it('BR-STAT-001: dueSoon when the card due date is within the 7-day CONV-7 horizon', () => {
    const obligation = card({ dueDate: toLocalDate('2026-07-05') })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('dueSoon')
  })

  it('BR-STAT-001: onTrack when a card due date exists, is far away, and nothing else fires', () => {
    const obligation = card({ dueDate: toLocalDate('2026-08-15') })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('onTrack')
  })

  it('BR-STAT-001: onTrack for a loan fully paid to date with no other signals', () => {
    const obligation = loan({ startDate: toLocalDate('2026-01-15') })
    const payments = [
      payment('obl-loan', '2026-02-15'),
      payment('obl-loan', '2026-03-15'),
      payment('obl-loan', '2026-04-15'),
      payment('obl-loan', '2026-05-15'),
      payment('obl-loan', '2026-06-15'),
    ]
    const status = deriveObligationStatus({ obligation, payments, insights: [], today: TODAY })
    expect(status).toBe('onTrack')
  })

  it('BR-STAT-001: onTrack for a brand-new loan whose first payment has not come due yet', () => {
    // Regression: a loan opened today has a fully-known schedule (term,
    // rate, next due date) even though zero periods have elapsed yet —
    // this must not fall through to `unknown` for lack of payment history.
    const obligation = loan({ startDate: TODAY, termMonths: sourced(36) })
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('onTrack')
  })

  it('BR-STAT-001: unknown when a P1 stub kind has no derivable schedule or balance signal', () => {
    const obligation = {
      id: brandId<'obligation'>('obl-generic'),
      userId,
      kind: 'genericFacility' as const,
      nickname: 'Test Facility',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: toLocalDate('2024-01-15'),
      provenance: demoProvenance(),
      createdAt: iso,
      updatedAt: iso,
    }
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('unknown')
  })

  it('BR-STAT-002 (aggregate, exercised here at the single-obligation level): unknown never silently becomes onTrack', () => {
    const obligation = {
      id: brandId<'obligation'>('obl-ijara'),
      userId,
      kind: 'ijara' as const,
      nickname: 'Test Ijara',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: toLocalDate('2020-01-15'),
      provenance: demoProvenance(),
      createdAt: iso,
      updatedAt: iso,
    }
    const status = deriveObligationStatus({ obligation, payments: [], insights: [], today: TODAY })
    expect(status).toBe('unknown')
  })
})

describe('getNextDueInfo', () => {
  it('returns the next cadence due date and installment amount for a loan', () => {
    const obligation = loan({ startDate: toLocalDate('2026-01-15') })
    const info = getNextDueInfo(obligation, TODAY)
    expect(info?.dueDate).toBe(toLocalDate('2026-07-15'))
    expect(info?.amount.value.toStorageString()).toBe(
      obligation.loanDetails.installment.value.toStorageString(),
    )
  })

  it('returns undefined for a murabaha/loan with no future due date left in term', () => {
    const obligation = loan({ startDate: toLocalDate('2026-01-15'), termMonths: sourced(1) })
    const info = getNextDueInfo(obligation, TODAY)
    expect(info).toBeUndefined()
  })

  it('resolves a known percent-with-floor minimum payment for a card due in the future', () => {
    const obligation = card({
      dueDate: toLocalDate('2026-07-20'),
      currentBalance: sourced(Money.of('2350')),
      minimumPaymentRule: { type: 'percent', value: Percentage.of('5'), floor: Money.of('20') },
    })
    const info = getNextDueInfo(obligation, TODAY)
    expect(info?.dueDate).toBe(toLocalDate('2026-07-20'))
    expect(info?.amount.value.toStorageString()).toBe('117.5')
    expect(info?.amount.provenance.source).toBe('estimate')
  })

  it('excludes a card whose minimum payment rule is unknown', () => {
    const obligation = card({
      dueDate: toLocalDate('2026-07-20'),
      minimumPaymentRule: { type: 'unknown' },
    })
    expect(getNextDueInfo(obligation, TODAY)).toBeUndefined()
  })

  it('excludes a card whose due date has already passed', () => {
    const obligation = card({
      dueDate: toLocalDate('2026-06-01'),
      minimumPaymentRule: { type: 'fixed', value: Money.of('50') },
    })
    expect(getNextDueInfo(obligation, TODAY)).toBeUndefined()
  })

  it('returns undefined for kinds with no cadence/due-date concept (genericFacility)', () => {
    const obligation = {
      id: brandId<'obligation'>('obl-generic'),
      userId,
      kind: 'genericFacility' as const,
      nickname: 'Test Facility',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: toLocalDate('2020-01-15'),
      provenance: demoProvenance(),
      createdAt: iso,
      updatedAt: iso,
    }
    expect(getNextDueInfo(obligation, TODAY)).toBeUndefined()
  })
})

describe('resolveMonthlyCommitment', () => {
  it('returns the fixed installment for a loan regardless of cadence position', () => {
    const obligation = loan()
    const commitment = resolveMonthlyCommitment(obligation, TODAY)
    expect(commitment?.value.toStorageString()).toBe(
      obligation.loanDetails.installment.value.toStorageString(),
    )
  })

  it('resolves a known card minimum-payment rule as an estimate', () => {
    const obligation = card({
      currentBalance: sourced(Money.of('1000')),
      minimumPaymentRule: { type: 'fixed', value: Money.of('75') },
    })
    const commitment = resolveMonthlyCommitment(obligation, TODAY)
    expect(commitment?.value.toStorageString()).toBe('75')
    expect(commitment?.provenance.source).toBe('estimate')
  })

  it('excludes a card with no minimum-payment rule at all', () => {
    const obligation = card()
    expect(resolveMonthlyCommitment(obligation, TODAY)).toBeUndefined()
  })
})

describe('extractOfficialBalance', () => {
  it('returns the outstanding balance for a loan when present', () => {
    const obligation = loan({ outstandingBalance: sourced(Money.of('15000')) })
    expect(extractOfficialBalance(obligation)?.value.toStorageString()).toBe('15000')
  })

  it('returns undefined for murabaha (no official balance concept)', () => {
    const obligation = murabaha()
    expect(extractOfficialBalance(obligation)).toBeUndefined()
  })

  it('returns the current balance for a credit card', () => {
    const obligation = card({ currentBalance: sourced(Money.of('2350')) })
    expect(extractOfficialBalance(obligation)?.value.toStorageString()).toBe('2350')
  })
})
