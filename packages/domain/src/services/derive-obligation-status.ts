/**
 * Obligation status derivation — BR-STAT-001.
 *
 * The ONLY place status is derived. Any attempt to derive ObligationStatus
 * elsewhere is a review-blocking defect (AI_AGENT_RULES §10, BR-STAT-001).
 *
 * Status is computed, never stored — derived from the current data snapshot
 * (obligation, payments, insights) plus an explicit `today` (no system clock —
 * financial dates are never read from `Date.now()`, matching BR-CALC-001's
 * rule for the finance engine).
 *
 * Precedence (first match wins) — domain-model.md §4:
 *   1. completed  2. notStarted  3. delinquent  4. overdue
 *   5. attentionRequired  6. calculationIncomplete  7. dataStale
 *   8. dueSoon  9. onTrack  10. unknown
 *
 * Two precedence steps need a mechanism the documented 4-argument signature
 * doesn't spell out — see PHASE-02-DECISION-LOG.md §13 for the DOC-ISSUE and
 * the smallest-safe-decision taken for each:
 *   - `calculationIncomplete` has no `CalculationRun` input to inspect, so a
 *     dedicated insight rule id signals engine refusal instead
 *     (CALCULATION_REFUSED_INSIGHT_RULE_ID).
 *   - `delinquent`/`overdue` need a due-date cadence with no documented
 *     generation algorithm; a minimal monthly-cadence heuristic is used,
 *     scoped to installment-bearing kinds (loan, murabaha) only. Cards use
 *     their explicit single `dueDate` field for overdue/dueSoon only — no
 *     delinquency-streak concept for cards is specified anywhere.
 */

import type { Obligation, ObligationStatus } from '../entities/obligation.js'
import type { Payment } from '../entities/payment.js'
import type { Insight } from '../entities/insight.js'
import type { Id, LocalDate } from '../value-objects/id.js'
import { Money } from '../value-objects/money.js'
import type { Provenance, Sourced } from '../value-objects/provenance.js'
import { isStale, engineEstimate } from '../value-objects/provenance.js'
import { resolveMinimumPaymentDue } from './resolve-minimum-payment.js'
import {
  addMonthsToLocalDate,
  compareLocalDate,
  daysBetweenLocalDates,
  isAfterLocalDate,
  isAtOrBeforeLocalDate,
} from '../value-objects/local-date-math.js'
import {
  BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS,
  CALCULATION_REFUSED_INSIGHT_RULE_ID,
  CONV_6_OVERDUE_GRACE_DAYS,
  CONV_7_DUE_SOON_HORIZON_DAYS,
} from '../constants.js'

export interface StatusDerivationInputs {
  readonly obligation: Obligation
  readonly payments: readonly Payment[]
  readonly insights: readonly Insight[]
  readonly today: LocalDate
}

// ─── Step 1: completed ────────────────────────────────────────────────────────

/** Best-available official balance per BR-PROV-001 — shared with dashboard aggregation. */
export function extractOfficialBalance(obligation: Obligation): Sourced<Money> | undefined {
  switch (obligation.kind) {
    case 'conventionalLoan':
      return obligation.loanDetails.outstandingBalance
    case 'creditCard':
      return obligation.cardDetails.currentBalance
    case 'genericFacility':
    case 'ijara':
    case 'diminishingMusharakah':
      return obligation.outstandingBalance
    case 'murabaha':
      return undefined
  }
}

function isCompletedByBalance(obligation: Obligation, payments: readonly Payment[]): boolean {
  if (obligation.kind === 'murabaha') {
    const paidSum = payments
      .filter((p) => p.obligationId === obligation.id)
      .reduce((acc, p) => acc.add(p.amount), Money.zero(obligation.currency))
    const remaining = obligation.murabahaDetails.totalSalePrice.value.subtract(paidSum)
    return !remaining.isPositive()
  }

  const balance = extractOfficialBalance(obligation)
  if (!balance || balance.provenance.source === 'estimate') return false
  return !balance.value.isPositive()
}

function isCompleted(obligation: Obligation, payments: readonly Payment[]): boolean {
  return obligation.closedDate !== undefined || isCompletedByBalance(obligation, payments)
}

// ─── Step 2: notStarted ───────────────────────────────────────────────────────

function getEffectiveStartDate(obligation: Obligation): LocalDate {
  if (obligation.kind === 'conventionalLoan') return obligation.loanDetails.startDate
  if (obligation.kind === 'murabaha') return obligation.murabahaDetails.startDate
  return obligation.openedDate
}

// ─── Steps 3–4, 8: due-date cadence for installment-bearing kinds ────────────

interface Cadence {
  readonly dueDatesUpToToday: readonly LocalDate[]
  readonly nextDueDate: LocalDate | undefined
}

function buildCadence(obligation: Obligation, today: LocalDate): Cadence | undefined {
  let cadenceStart: LocalDate
  let termMonths: number

  if (obligation.kind === 'conventionalLoan') {
    cadenceStart =
      obligation.loanDetails.firstPaymentDate ??
      addMonthsToLocalDate(obligation.loanDetails.startDate, 1)
    termMonths = obligation.loanDetails.termMonths.value
  } else if (obligation.kind === 'murabaha') {
    cadenceStart = addMonthsToLocalDate(obligation.murabahaDetails.startDate, 1)
    termMonths = obligation.murabahaDetails.termMonths.value
  } else {
    return undefined
  }

  if (termMonths <= 0) return undefined

  const dueDatesUpToToday: LocalDate[] = []
  for (let i = 0; i < termMonths; i++) {
    const d = addMonthsToLocalDate(cadenceStart, i)
    if (isAfterLocalDate(d, today)) {
      return { dueDatesUpToToday, nextDueDate: d }
    }
    dueDatesUpToToday.push(d)
  }
  return { dueDatesUpToToday, nextDueDate: undefined }
}

function isPeriodPaid(
  payments: readonly Payment[],
  obligationId: Id<'obligation'>,
  lowerExclusive: LocalDate,
  dueDate: LocalDate,
): boolean {
  return payments.some(
    (p) =>
      p.obligationId === obligationId &&
      isAfterLocalDate(p.date, lowerExclusive) &&
      isAtOrBeforeLocalDate(p.date, dueDate),
  )
}

/** Count of consecutive unpaid periods at the tail of the due-date list (most recent first). */
function trailingUnpaidCount(
  dueDates: readonly LocalDate[],
  payments: readonly Payment[],
  obligationId: Id<'obligation'>,
): number {
  let count = 0
  for (let i = dueDates.length - 1; i >= 0; i--) {
    const dueDate = dueDates[i] as LocalDate
    const lower = i === 0 ? addMonthsToLocalDate(dueDate, -1) : (dueDates[i - 1] as LocalDate)
    if (isPeriodPaid(payments, obligationId, lower, dueDate)) break
    count++
  }
  return count
}

// ─── Steps 5–6: insight-driven states ─────────────────────────────────────────

function hasUnresolvedAttentionInsight(
  obligation: Obligation,
  insights: readonly Insight[],
): boolean {
  return insights.some(
    (i) => i.obligationId === obligation.id && i.severity === 'attention' && i.readAt === undefined,
  )
}

function hasCalculationRefusedInsight(
  obligation: Obligation,
  insights: readonly Insight[],
): boolean {
  return insights.some(
    (i) =>
      i.ruleId === CALCULATION_REFUSED_INSIGHT_RULE_ID &&
      (i.obligationId === obligation.id || i.obligationId === undefined),
  )
}

// ─── Step 7: dataStale (P1 network sources only — domain-model.md §4) ────────

function collectProvenances(obligation: Obligation): readonly Provenance[] {
  const provenances: Provenance[] = []
  switch (obligation.kind) {
    case 'conventionalLoan': {
      const d = obligation.loanDetails
      provenances.push(
        d.originalPrincipal.provenance,
        d.installment.provenance,
        d.termMonths.provenance,
      )
      if (d.outstandingBalance) provenances.push(d.outstandingBalance.provenance)
      if (d.contractualBalloon) provenances.push(d.contractualBalloon.provenance)
      break
    }
    case 'murabaha': {
      const d = obligation.murabahaDetails
      provenances.push(
        d.assetCost.provenance,
        d.disclosedProfit.provenance,
        d.totalSalePrice.provenance,
        d.installment.provenance,
        d.termMonths.provenance,
      )
      break
    }
    case 'creditCard': {
      const d = obligation.cardDetails
      provenances.push(d.creditLimit.provenance, d.currentBalance.provenance)
      if (d.statementBalance) provenances.push(d.statementBalance.provenance)
      if (d.purchaseApr) provenances.push(d.purchaseApr.provenance)
      if (d.cashAdvanceApr) provenances.push(d.cashAdvanceApr.provenance)
      break
    }
    case 'genericFacility':
    case 'ijara':
    case 'diminishingMusharakah':
      if (obligation.outstandingBalance) provenances.push(obligation.outstandingBalance.provenance)
      break
  }
  return provenances
}

function hasStaleOfficialData(obligation: Obligation, today: LocalDate): boolean {
  const nowIso = `${today}T00:00:00.000Z`
  return collectProvenances(obligation).some(
    (p) => (p.source === 'official' || p.source === 'bureau') && isStale(p, nowIso),
  )
}

// ─── Monthly commitment (dashboard aggregation — financial-calculation-spec.md
// §4.7 aggregates.v1: "current installments + card minimum, estimated where
// rule known") ──────────────────────────────────────────────────────────────

export function resolveMonthlyCommitment(
  obligation: Obligation,
  today: LocalDate,
): Sourced<Money> | undefined {
  if (obligation.kind === 'conventionalLoan') return obligation.loanDetails.installment
  if (obligation.kind === 'murabaha') return obligation.murabahaDetails.installment

  if (obligation.kind === 'creditCard') {
    const { minimumPaymentRule, currentBalance } = obligation.cardDetails
    if (minimumPaymentRule === undefined) return undefined
    const resolution = resolveMinimumPaymentDue(minimumPaymentRule, currentBalance.value)
    if (resolution.kind === 'unknown') return undefined
    return engineEstimate(resolution.amount, 'resolveMinimumPaymentDue', today)
  }

  return undefined
}

// ─── Next due payment (dashboard aggregation — FR-CALC-006 companion) ────────
// Reuses the same cadence/due-date logic as steps 3–4/8 above rather than
// re-deriving it, so "next payment" never drifts from the status precedence
// it's read alongside.

export interface NextDueInfo {
  readonly dueDate: LocalDate
  readonly amount: Sourced<Money>
}

export function getNextDueInfo(obligation: Obligation, today: LocalDate): NextDueInfo | undefined {
  if (obligation.kind === 'conventionalLoan' || obligation.kind === 'murabaha') {
    const cadence = buildCadence(obligation, today)
    if (!cadence?.nextDueDate) return undefined
    const installment =
      obligation.kind === 'conventionalLoan'
        ? obligation.loanDetails.installment
        : obligation.murabahaDetails.installment
    return { dueDate: cadence.nextDueDate, amount: installment }
  }

  if (obligation.kind === 'creditCard') {
    const { dueDate, minimumPaymentRule, currentBalance } = obligation.cardDetails
    if (dueDate === undefined || compareLocalDate(dueDate, today) < 0) return undefined
    if (minimumPaymentRule === undefined) return undefined
    const resolution = resolveMinimumPaymentDue(minimumPaymentRule, currentBalance.value)
    if (resolution.kind === 'unknown') return undefined
    return {
      dueDate,
      amount: engineEstimate(resolution.amount, 'resolveMinimumPaymentDue', today),
    }
  }

  return undefined
}

// ─── Main derivation ──────────────────────────────────────────────────────────

export function deriveObligationStatus(inputs: StatusDerivationInputs): ObligationStatus {
  const { obligation, payments, insights, today } = inputs

  // 1. completed
  if (isCompleted(obligation, payments)) return 'completed'

  // 2. notStarted
  if (isAfterLocalDate(getEffectiveStartDate(obligation), today)) return 'notStarted'

  const cadence = buildCadence(obligation, today)

  // 3. delinquent (installment-bearing kinds only)
  if (cadence && cadence.dueDatesUpToToday.length > 0) {
    const unpaidStreak = trailingUnpaidCount(cadence.dueDatesUpToToday, payments, obligation.id)
    if (unpaidStreak >= BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS) return 'delinquent'

    // 4. overdue — most recent due period unpaid, past grace window
    if (unpaidStreak >= 1) {
      const mostRecentDueDate = cadence.dueDatesUpToToday[
        cadence.dueDatesUpToToday.length - 1
      ] as LocalDate
      if (daysBetweenLocalDates(mostRecentDueDate, today) > CONV_6_OVERDUE_GRACE_DAYS)
        return 'overdue'
    }
  } else if (obligation.kind === 'creditCard' && obligation.cardDetails.dueDate !== undefined) {
    const dueDate = obligation.cardDetails.dueDate
    if (compareLocalDate(dueDate, today) < 0) {
      const paidSinceDue = payments.some(
        (p) => p.obligationId === obligation.id && isAfterLocalDate(p.date, dueDate),
      )
      if (!paidSinceDue && daysBetweenLocalDates(dueDate, today) > CONV_6_OVERDUE_GRACE_DAYS) {
        return 'overdue'
      }
    }
  }

  // 5. attentionRequired
  if (hasUnresolvedAttentionInsight(obligation, insights)) return 'attentionRequired'

  // 6. calculationIncomplete
  if (hasCalculationRefusedInsight(obligation, insights)) return 'calculationIncomplete'

  // 7. dataStale (P1 — inert in MVP: no official/bureau sources exist yet)
  if (hasStaleOfficialData(obligation, today)) return 'dataStale'

  // 8. dueSoon
  if (cadence?.nextDueDate !== undefined) {
    const daysUntilDue = daysBetweenLocalDates(today, cadence.nextDueDate)
    if (daysUntilDue >= 0 && daysUntilDue <= CONV_7_DUE_SOON_HORIZON_DAYS) return 'dueSoon'
  }
  if (obligation.kind === 'creditCard' && obligation.cardDetails.dueDate !== undefined) {
    const daysUntilDue = daysBetweenLocalDates(today, obligation.cardDetails.dueDate)
    if (daysUntilDue >= 0 && daysUntilDue <= CONV_7_DUE_SOON_HORIZON_DAYS) return 'dueSoon'
  }

  // 9. onTrack — only claimable when a schedule signal actually exists. A
  // defined `cadence` already means termMonths/startDate produced a real
  // due-date schedule (buildCadence returns undefined otherwise) — that's
  // true even for a brand-new loan whose first period hasn't come due yet
  // (dueDatesUpToToday is empty but nextDueDate is known), so it must not
  // be excluded here or a fresh loan falls through to `unknown` despite
  // having complete schedule data.
  const hasScheduleSignal =
    cadence !== undefined ||
    (obligation.kind === 'creditCard' && obligation.cardDetails.dueDate !== undefined)
  if (hasScheduleSignal) return 'onTrack'

  // 10. unknown — insufficient data to place in any state
  return 'unknown'
}
