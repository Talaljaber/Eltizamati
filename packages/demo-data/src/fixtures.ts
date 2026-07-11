/**
 * Test fixtures — Phase 5 (seed-demo-data.md §3).
 *
 * One fixture vocabulary everywhere: `aLoan({overrides})`, etc.
 * Anti-pattern guard: divergent hand-rolled test data in individual test files.
 *
 * Usage:
 *   const loan = aLoan({ nickname: 'Custom Loan' })
 *   const payment = aPayment({ amount: Money.of('500', 'JOD') })
 */

import {
  Money,
  Rate,
  brandId,
  addMonthsToLocalDate,
  type ConventionalLoan,
  type MurabahaFinancing,
  type CreditCard,
  type Payment,
  type RatePeriod,
  type Insight,
  type Provenance,
} from '@eltizamati/domain'

import { DEMO_DATE, DEMO_SEED_VERSION } from './constants.js'
import { DEMO_IDS, buildDemoLoan, buildDemoMurabaha, buildDemoCard } from './builders.js'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const FIXTURE_RECORDED_AT = `${DEMO_DATE}T00:00:00.000Z`

function fixtureProvenance(): Provenance {
  return {
    source: 'demo',
    providerId: 'demo-seed',
    sourceReference: DEMO_SEED_VERSION,
    observedAt: FIXTURE_RECORDED_AT,
    recordedAt: FIXTURE_RECORDED_AT,
  }
}

// ─── aLoan ────────────────────────────────────────────────────────────────────

/**
 * Returns the canonical demo loan with optional shallow overrides.
 * Use this in every test that needs a ConventionalLoan — never roll your own.
 */
export function aLoan(overrides: Partial<ConventionalLoan> = {}): ConventionalLoan {
  return { ...buildDemoLoan(DEMO_DATE), ...overrides }
}

// ─── aMurabaha ────────────────────────────────────────────────────────────────

export function aMurabaha(overrides: Partial<MurabahaFinancing> = {}): MurabahaFinancing {
  return { ...buildDemoMurabaha(DEMO_DATE), ...overrides }
}

// ─── aCard ────────────────────────────────────────────────────────────────────

export function aCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return { ...buildDemoCard(DEMO_DATE), ...overrides }
}

// ─── aPayment ─────────────────────────────────────────────────────────────────

/**
 * Returns a valid Payment for the demo loan. Override any field as needed.
 * Note: `id` is not stable across fixture calls — use a fixed id override in
 * tests that need to reference the same payment twice.
 */
export function aPayment(overrides: Partial<Payment> = {}, seq = 1): Payment {
  const seqStr = String(seq).padStart(3, '0')
  return {
    id: brandId<'payment'>(`fixture-pay-${seqStr}-0000-0000-0000-0000000000`),
    obligationId: DEMO_IDS.loanId,
    userId: DEMO_IDS.userId,
    date: addMonthsToLocalDate(DEMO_DATE, -seq),
    amount: Money.of('310', 'JOD'),
    provenance: fixtureProvenance(),
    createdAt: FIXTURE_RECORDED_AT,
    ...overrides,
  }
}

// ─── aRatePeriod ──────────────────────────────────────────────────────────────

export function aRatePeriod(overrides: Partial<RatePeriod> = {}, seq = 1): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(`fixture-rp-${seq}--0000-0000-0000-0000000000`),
    obligationId: DEMO_IDS.loanId,
    annualRate: Rate.fromPercent('7.5'),
    effectiveFrom: addMonthsToLocalDate(DEMO_DATE, -30),
    provenance: fixtureProvenance(),
    createdAt: FIXTURE_RECORDED_AT,
    ...overrides,
  }
}

// ─── anInsight ────────────────────────────────────────────────────────────────

export function anInsight(overrides: Partial<Insight> = {}, seq = 1): Insight {
  return {
    id: brandId<'insight'>(`fixture-ins-${seq}-0000-0000-0000-0000000000`),
    userId: DEMO_IDS.userId,
    ruleId: `FIXTURE_RULE_${seq}`,
    obligationId: DEMO_IDS.loanId,
    severity: 'info',
    titleKey: 'insights.fixture.title',
    bodyKey: 'insights.fixture.body',
    triggerHash: `fixture-trigger-${seq}`,
    createdAt: FIXTURE_RECORDED_AT,
    ...overrides,
  }
}
