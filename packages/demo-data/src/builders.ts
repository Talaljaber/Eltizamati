/**
 * Deterministic demo seed builders — Phase 5 (seed-demo-data.md §2).
 *
 * Rules (AI_AGENT_RULES §5-6, seed-demo-data.md §1):
 *   - No Date.now(), no Math.random(), no network.
 *   - All monetary values via Money.of(string) — never JS number arithmetic.
 *   - All IDs are fixed UUID strings — deterministic across every run.
 *   - All dates computed from the demoDate parameter via addMonthsToLocalDate.
 *   - seedVersion stamped into every provenance.sourceReference.
 *
 * Canonical content: mvp-scope.md §4, seed-demo-data.md §2.
 */

import {
  Money,
  Rate,
  Percentage,
  brandId,
  addMonthsToLocalDate,
  addDaysToLocalDate,
  demoSourced,
  DomainInvariantError,
  type LocalDate,
  type Id,
  type ConventionalLoan,
  type MurabahaFinancing,
  type CreditCard,
  type Payment,
  type RatePeriod,
  type Insight,
  type Provenance,
} from '@eltizamati/domain'
import {
  evaluateRateIncreased,
  evaluateInstallmentUnchangedAfterIncrease,
  evaluateResidualRisk,
  computeVariableProjection,
  computeResidualDetection,
} from '@eltizamati/finance-engine'

import { DEMO_DATE, DEMO_SEED_VERSION } from './constants.js'

// ─── Deterministic IDs ────────────────────────────────────────────────────────

/** All demo entity IDs are fixed so the seed is stable across resets. */
export const DEMO_IDS = {
  userId: brandId<'user'>('demo-user-0000-0000-0000-0000-00000001'),

  // Obligations
  loanId: brandId<'obligation'>('demo-loan-0000-0000-0000-0000-00000001'),
  murabahaId: brandId<'obligation'>('demo-mrb--0000-0000-0000-0000-00000002'),
  cardId: brandId<'obligation'>('demo-card-0000-0000-0000-0000-00000003'),

  // Rate periods for the loan
  ratePeriod1Id: brandId<'ratePeriod'>('demo-rp1--0000-0000-0000-0000-00000001'),
  ratePeriod2Id: brandId<'ratePeriod'>('demo-rp2--0000-0000-0000-0000-00000002'),

  // Insights
  insightRateIncreasedId: brandId<'insight'>('demo-ins1-0000-0000-0000-0000-00000001'),
  insightInstallmentId: brandId<'insight'>('demo-ins2-0000-0000-0000-0000-00000002'),
  insightResidualId: brandId<'insight'>('demo-ins3-0000-0000-0000-0000-00000003'),

  // Consent record
  consentId: brandId<'consentRecord'>('demo-con--0000-0000-0000-0000-00000001'),
} as const

// ─── Shared provenance factory ─────────────────────────────────────────────

function demoProvenance(observedAt: string, recordedAt: string): Provenance {
  return {
    source: 'demo',
    providerId: 'demo-seed',
    sourceReference: DEMO_SEED_VERSION,
    observedAt,
    recordedAt,
  }
}

// ─── buildDemoLoan ────────────────────────────────────────────────────────────

/**
 * Canonical variable-rate personal loan (mvp-scope §4 #1):
 *   - 20,000 JOD original principal
 *   - 84-month term
 *   - 7.5% for months 1–14, then 9.25% from month 15 onward (installment unchanged)
 *   - 30 months elapsed as of demoDate
 *   - Installment: 310 JOD (unchanged across rate change, per spec)
 */
export function buildDemoLoan(demoDate: LocalDate = DEMO_DATE): ConventionalLoan {
  const recordedAt = `${demoDate}T00:00:00.000Z`
  // Loan started 30 months before demoDate
  const startDate = addMonthsToLocalDate(demoDate, -30)
  const maturityDate = addMonthsToLocalDate(startDate, 84)
  // Rate changed at month 15 → effectiveFrom = start + 14 months
  const rateChangeDate = addMonthsToLocalDate(startDate, 14)

  return {
    id: DEMO_IDS.loanId,
    userId: DEMO_IDS.userId,
    kind: 'conventionalLoan',
    connectionType: 'official',
    nickname: 'Personal Loan – Bank of Amman',
    institution: { name: 'Bank of Amman (Fictional)' },
    currency: 'JOD',
    openedDate: startDate,
    provenance: demoProvenance(recordedAt, recordedAt),
    createdAt: recordedAt,
    updatedAt: recordedAt,
    loanDetails: {
      originalPrincipal: demoSourced(
        Money.of('20000', 'JOD'),
        DEMO_SEED_VERSION,
        recordedAt,
        recordedAt,
      ),
      installment: demoSourced(Money.of('310', 'JOD'), DEMO_SEED_VERSION, recordedAt, recordedAt),
      rateType: 'variable',
      ratePeriods: [
        {
          id: DEMO_IDS.ratePeriod1Id,
          obligationId: DEMO_IDS.loanId,
          annualRate: Rate.fromPercent('7.5'),
          effectiveFrom: startDate,
          provenance: demoProvenance(recordedAt, recordedAt),
          createdAt: recordedAt,
        },
        {
          id: DEMO_IDS.ratePeriod2Id,
          obligationId: DEMO_IDS.loanId,
          annualRate: Rate.fromPercent('9.25'),
          effectiveFrom: rateChangeDate,
          provenance: demoProvenance(recordedAt, recordedAt),
          createdAt: recordedAt,
        },
      ],
      termMonths: demoSourced(84, DEMO_SEED_VERSION, recordedAt, recordedAt),
      startDate,
      maturityDate,
      firstPaymentDate: addMonthsToLocalDate(startDate, 1),
      paymentFrequency: 'monthly',
      purpose: 'personal',
    },
  }
}

// ─── buildDemoMurabaha ────────────────────────────────────────────────────────

/**
 * Canonical Murabaha auto financing (mvp-scope §4 #2):
 *   - Asset cost: 15,000 JOD
 *   - Disclosed profit: 3,600 JOD
 *   - Total sale price: 18,600 JOD (= 15,000 + 3,600 — INV-7)
 *   - Term: 60 months
 *   - 22 payments of 310 JOD paid
 *   - Start date: demoDate − 22 months
 */
export function buildDemoMurabaha(demoDate: LocalDate = DEMO_DATE): MurabahaFinancing {
  const recordedAt = `${demoDate}T00:00:00.000Z`
  const startDate = addMonthsToLocalDate(demoDate, -22)

  return {
    id: DEMO_IDS.murabahaId,
    userId: DEMO_IDS.userId,
    kind: 'murabaha',
    connectionType: 'official',
    nickname: 'Murabaha Auto – Safa Islamic Bank',
    institution: { name: 'Safa Islamic Bank (Fictional)' },
    currency: 'JOD',
    openedDate: startDate,
    provenance: demoProvenance(recordedAt, recordedAt),
    createdAt: recordedAt,
    updatedAt: recordedAt,
    murabahaDetails: {
      assetCost: demoSourced(Money.of('15000', 'JOD'), DEMO_SEED_VERSION, recordedAt, recordedAt),
      disclosedProfit: demoSourced(
        Money.of('3600', 'JOD'),
        DEMO_SEED_VERSION,
        recordedAt,
        recordedAt,
      ),
      totalSalePrice: demoSourced(
        Money.of('18600', 'JOD'),
        DEMO_SEED_VERSION,
        recordedAt,
        recordedAt,
      ),
      installment: demoSourced(Money.of('310', 'JOD'), DEMO_SEED_VERSION, recordedAt, recordedAt),
      termMonths: demoSourced(60, DEMO_SEED_VERSION, recordedAt, recordedAt),
      startDate,
      profitRateDisclosed: Rate.fromPercent('24'),
    },
  }
}

// ─── buildDemoCard ────────────────────────────────────────────────────────────

/**
 * Canonical credit card (mvp-scope §4 #3):
 *   - Credit limit: 4,000 JOD
 *   - Current balance: 2,350 JOD (58.75% utilization)
 *   - Min payment: 3% of balance, floor 10 JOD
 *   - Purchase APR: 24%
 *   - Due date: demoDate + 12 days (card is calm — below 70% utilization threshold)
 */
export function buildDemoCard(demoDate: LocalDate = DEMO_DATE): CreditCard {
  const recordedAt = `${demoDate}T00:00:00.000Z`
  const openedDate = addMonthsToLocalDate(demoDate, -18)
  const statementDate = addDaysToLocalDate(demoDate, -5)
  const dueDate = addDaysToLocalDate(demoDate, 12)

  return {
    id: DEMO_IDS.cardId,
    userId: DEMO_IDS.userId,
    kind: 'creditCard',
    connectionType: 'official',
    nickname: 'Credit Card – Bank of Amman',
    institution: { name: 'Bank of Amman (Fictional)' },
    currency: 'JOD',
    openedDate,
    provenance: demoProvenance(recordedAt, recordedAt),
    createdAt: recordedAt,
    updatedAt: recordedAt,
    cardDetails: {
      creditLimit: demoSourced(Money.of('4000', 'JOD'), DEMO_SEED_VERSION, recordedAt, recordedAt),
      currentBalance: demoSourced(
        Money.of('2350', 'JOD'),
        DEMO_SEED_VERSION,
        recordedAt,
        recordedAt,
      ),
      statementBalance: demoSourced(
        Money.of('2350', 'JOD'),
        DEMO_SEED_VERSION,
        recordedAt,
        recordedAt,
      ),
      statementDate,
      minimumPaymentRule: {
        type: 'percent',
        value: Percentage.of('3'),
        floor: Money.of('10', 'JOD'),
      },
      purchaseApr: demoSourced(Rate.fromPercent('24'), DEMO_SEED_VERSION, recordedAt, recordedAt),
      dueDate,
    },
  }
}

// ─── Payment histories ────────────────────────────────────────────────────────

/**
 * 30 on-time monthly payments for the loan (all 310 JOD installment).
 * Payment IDs are deterministic.
 */
export function buildDemoLoanPayments(demoDate: LocalDate = DEMO_DATE): readonly Payment[] {
  const recordedAt = `${demoDate}T00:00:00.000Z`
  const loan = buildDemoLoan(demoDate)
  const firstPaymentDate =
    loan.loanDetails.firstPaymentDate ?? addMonthsToLocalDate(loan.loanDetails.startDate, 1)
  const payments: Payment[] = []

  for (let i = 0; i < 30; i++) {
    const payDate = addMonthsToLocalDate(firstPaymentDate, i)
    const seq = String(i + 1).padStart(3, '0')
    payments.push({
      id: brandId<'payment'>(`demo-pay-loan-${seq}-0000-0000000000`),
      obligationId: DEMO_IDS.loanId,
      userId: DEMO_IDS.userId,
      date: payDate,
      amount: Money.of('310', 'JOD'),
      provenance: demoProvenance(recordedAt, recordedAt),
      createdAt: recordedAt,
    })
  }

  return payments
}

/**
 * 22 on-time monthly Murabaha installment payments (310 JOD each).
 */
export function buildDemoMurabahaPayments(demoDate: LocalDate = DEMO_DATE): readonly Payment[] {
  const recordedAt = `${demoDate}T00:00:00.000Z`
  const murabaha = buildDemoMurabaha(demoDate)
  const firstPayDate = addMonthsToLocalDate(murabaha.murabahaDetails.startDate, 1)
  const payments: Payment[] = []

  for (let i = 0; i < 22; i++) {
    const payDate = addMonthsToLocalDate(firstPayDate, i)
    const seq = String(i + 1).padStart(3, '0')
    payments.push({
      id: brandId<'payment'>(`demo-pay-mrb-${seq}-0000-0000000000`),
      obligationId: DEMO_IDS.murabahaId,
      userId: DEMO_IDS.userId,
      date: payDate,
      amount: Money.of('310', 'JOD'),
      provenance: demoProvenance(recordedAt, recordedAt),
      createdAt: recordedAt,
    })
  }

  return payments
}

// ─── Rate period extraction helper ────────────────────────────────────────────

export function buildDemoLoanRatePeriods(demoDate: LocalDate = DEMO_DATE): readonly RatePeriod[] {
  return buildDemoLoan(demoDate).loanDetails.ratePeriods as readonly RatePeriod[]
}

// ─── Pre-seeded insights ──────────────────────────────────────────────────────

/**
 * Pre-seeded insights for the demo (seed-demo-data.md §2.4):
 *   1. RATE_INCREASED (read — dismissed, so it doesn't produce attentionRequired)
 *   2. INSTALLMENT_UNCHANGED_AFTER_INCREASE (unread — triggers attentionRequired on the loan)
 *   3. RESIDUAL_RISK (unread — pending engine enrichment in Phase 6)
 */
export function buildDemoInsights(demoDate: LocalDate = DEMO_DATE): readonly Insight[] {
  const recordedAt = `${demoDate}T00:00:00.000Z`
  const loan = buildDemoLoan(demoDate)
  const loanDetails = loan.loanDetails
  const ratePeriods = loanDetails.ratePeriods
  const rateChangeDate = ratePeriods[1]?.effectiveFrom ?? demoDate

  // Derive the real triggerHash/params from the actual finance-engine
  // evaluators/formulas rather than hardcoding placeholder strings — this
  // keeps the seed in sync with what a live evaluation service (Phase 7's
  // InsightEvaluationService) would independently compute, so it recognizes
  // these seeded insights instead of raising duplicates.
  const rateIncreasedCandidates = evaluateRateIncreased(loan.id, ratePeriods)
  const rateIncreasedCandidate = rateIncreasedCandidates[rateIncreasedCandidates.length - 1]
  if (rateIncreasedCandidate === undefined) {
    throw new DomainInvariantError(
      'validation',
      'buildDemoInsights: expected the demo loan to have a rate increase',
    )
  }

  // installmentUnchangedSinceLastIncrease = true: the seed's own design is
  // that the 310 JOD installment stayed fixed across the 7.5% -> 9.25%
  // reprice (see buildDemoLoan's docblock).
  const installmentUnchangedCandidates = evaluateInstallmentUnchangedAfterIncrease(
    loan.id,
    ratePeriods,
    true,
  )
  const installmentUnchangedCandidate =
    installmentUnchangedCandidates[installmentUnchangedCandidates.length - 1]
  if (installmentUnchangedCandidate === undefined) {
    throw new DomainInvariantError(
      'validation',
      'buildDemoInsights: expected INSTALLMENT_UNCHANGED_AFTER_INCREASE to fire for the demo loan',
    )
  }

  // Real residualDetection.v1 result, fed by a real variableProjection.v1
  // run over the loan's actual principal/ratePeriods/term/installment with
  // installmentPolicy: {kind: 'unchanged'} (matches "installment stayed the
  // same" design) as of demoDate — never invented numbers.
  const projection = computeVariableProjection(
    loanDetails.originalPrincipal.value,
    ratePeriods,
    loanDetails.termMonths.value,
    loanDetails.startDate,
    loanDetails.installment.value,
    { kind: 'unchanged' },
    demoDate,
  )
  const residualDetection = computeResidualDetection(
    projection.projectedResidualAtMaturity,
    loanDetails.originalPrincipal.value,
    loanDetails.installment.value,
    { rateIncreasedWithUnchangedInstallment: true },
    demoDate,
  )
  const residualRiskCandidates = evaluateResidualRisk(loan.id, residualDetection)
  const residualRiskCandidate = residualRiskCandidates[residualRiskCandidates.length - 1]
  if (residualRiskCandidate === undefined) {
    throw new DomainInvariantError(
      'validation',
      'buildDemoInsights: expected the demo loan to have real residual risk (hasResidualRisk=false) — the seed narrative no longer holds',
    )
  }

  return [
    {
      id: DEMO_IDS.insightRateIncreasedId,
      userId: DEMO_IDS.userId,
      ruleId: 'RATE_INCREASED',
      obligationId: DEMO_IDS.loanId,
      severity: 'attention' as const,
      titleKey: 'insights.rateIncreased.title',
      bodyKey: 'insights.rateIncreased.body',
      params: rateIncreasedCandidate.params ?? {},
      triggerHash: rateIncreasedCandidate.triggerHash,
      readAt: `${rateChangeDate}T12:00:00.000Z`, // already read
      createdAt: `${rateChangeDate}T00:00:00.000Z`,
    },
    {
      id: DEMO_IDS.insightInstallmentId,
      userId: DEMO_IDS.userId,
      ruleId: 'INSTALLMENT_UNCHANGED_AFTER_INCREASE',
      obligationId: DEMO_IDS.loanId,
      severity: 'attention' as const,
      titleKey: 'insights.installmentUnchanged.title',
      bodyKey: 'insights.installmentUnchanged.body',
      params: { installment: '310' },
      triggerHash: installmentUnchangedCandidate.triggerHash,
      // unread — will trigger attentionRequired status on the loan
      createdAt: `${rateChangeDate}T00:00:00.000Z`,
    },
    {
      id: DEMO_IDS.insightResidualId,
      userId: DEMO_IDS.userId,
      ruleId: 'RESIDUAL_RISK',
      obligationId: DEMO_IDS.loanId,
      severity: 'urgent' as const,
      titleKey: 'insights.residualRisk.title',
      bodyKey: 'insights.residualRisk.body',
      params: residualRiskCandidate.params ?? {},
      triggerHash: residualRiskCandidate.triggerHash,
      // unread
      createdAt: recordedAt,
    },
  ]
}

// ─── DemoSeed bundle type ─────────────────────────────────────────────────────

export interface DemoSeed {
  readonly seedVersion: string
  readonly demoDate: LocalDate
  readonly userId: Id<'user'>
  readonly loan: ConventionalLoan
  readonly murabaha: MurabahaFinancing
  readonly card: CreditCard
  readonly loanPayments: readonly Payment[]
  readonly murabahaPayments: readonly Payment[]
  readonly insights: readonly Insight[]
}

// ─── buildDemoSeed ────────────────────────────────────────────────────────────

/**
 * Canonical entry-point — produces a complete, self-consistent demo dataset
 * anchored to `demoDate`.
 *
 * Double-run equality: calling buildDemoSeed twice with the same demoDate
 * produces structurally identical output — no random IDs, no Date.now().
 */
export function buildDemoSeed(
  { demoDate }: { demoDate: LocalDate } = { demoDate: DEMO_DATE },
): DemoSeed {
  return {
    seedVersion: DEMO_SEED_VERSION,
    demoDate,
    userId: DEMO_IDS.userId,
    loan: buildDemoLoan(demoDate),
    murabaha: buildDemoMurabaha(demoDate),
    card: buildDemoCard(demoDate),
    loanPayments: buildDemoLoanPayments(demoDate),
    murabahaPayments: buildDemoMurabahaPayments(demoDate),
    insights: buildDemoInsights(demoDate),
  }
}
