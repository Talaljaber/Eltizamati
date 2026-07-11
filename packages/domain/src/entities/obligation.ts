/**
 * Obligation domain entities — discriminated union (ADR-0008).
 *
 * The union is the compile-time gate that prevents Murabaha from reaching loan formulas
 * and conventional loan UI from rendering Islamic terminology (BR-TERM-001, BR-CALC-020).
 *
 * All subtypes share the `ObligationBase` fields.
 * Subtype-specific fields are on the literal-typed variants.
 *
 * Data model: domain-model.md §3
 * Schema: database-schema.md §1 (ERD)
 */

import type { Id, LocalDate } from '../value-objects/id.js'
import type { Money, Rate } from '../value-objects/money.js'
import type { Sourced } from '../value-objects/provenance.js'

// ─── Obligation kind (the discriminant) ──────────────────────────────────────

export type ObligationKind =
  | 'conventionalLoan'
  | 'murabaha'
  | 'ijara'
  | 'diminishingMusharakah'
  | 'creditCard'
  | 'genericFacility'

// ─── Shared base ─────────────────────────────────────────────────────────────

export interface ObligationBase {
  readonly id: Id<'obligation'>
  readonly userId: string // localProfileId in MVP, auth.uid() in P1 (database-schema.md §1)
  readonly kind: ObligationKind
  readonly nickname: string
  readonly institutionName: string
  readonly currency: string // 'JOD' in MVP
  readonly openedDate: LocalDate
  readonly closedDate?: LocalDate
  readonly notes?: string
  readonly createdAt: string
  readonly updatedAt: string
}

// ─── Obligation Status (derived — BR-STAT-001) ────────────────────────────────
// Values and precedence order are normative — domain-model.md §4. Deriving or
// inventing a status value anywhere but `deriveObligationStatus` is forbidden.

export type ObligationStatus =
  | 'onTrack'
  | 'dueSoon'
  | 'overdue'
  | 'delinquent'
  | 'attentionRequired'
  | 'dataStale'
  | 'calculationIncomplete'
  | 'notStarted'
  | 'completed'
  | 'unknown'

// ─── Conventional Loan ────────────────────────────────────────────────────────

export type RateType = 'fixed' | 'variable' | 'mixed' | 'unknown'

/** personal/auto/housing are purposes of a conventional loan, never separate obligation kinds (ADR-0008). */
export type LoanPurpose = 'personal' | 'auto' | 'housing' | 'other'

export interface ConventionalLoanDetails {
  readonly originalPrincipal: Sourced<Money>
  readonly outstandingBalance?: Sourced<Money>
  readonly installment: Sourced<Money>
  readonly rateType: RateType
  readonly termMonths: Sourced<number>
  readonly startDate: LocalDate
  readonly maturityDate: LocalDate
  readonly firstPaymentDate?: LocalDate
  readonly paymentFrequency: 'monthly'
  readonly purpose?: LoanPurpose
  readonly contractualBalloon?: Sourced<Money>
}

export interface ConventionalLoan extends ObligationBase {
  readonly kind: 'conventionalLoan'
  readonly loanDetails: ConventionalLoanDetails
}

// ─── Murabaha ────────────────────────────────────────────────────────────────

export interface MurabahaDetails {
  /** Fixed at contract signing — never changes (ASM-010, BR-CALC-020). */
  readonly totalSalePrice: Sourced<Money>
  readonly assetCost: Sourced<Money>
  readonly disclosedProfit: Sourced<Money>
  readonly installment: Sourced<Money>
  readonly termMonths: number
  readonly startDate: LocalDate
  /** Display-only — not used in calculations (BR-CALC-020). */
  readonly profitRateDisclosed?: Rate
}

export interface MurabahaFinancing extends ObligationBase {
  readonly kind: 'murabaha'
  readonly murabahaDetails: MurabahaDetails
}

// ─── Credit Card ─────────────────────────────────────────────────────────────

export type MinPaymentRule =
  { type: 'percentFloor'; percent: number; floorAmount: Money } | { type: 'fixed'; amount: Money }

export interface CardDetails {
  readonly creditLimit: Sourced<Money>
  readonly currentBalance: Sourced<Money>
  readonly statementBalance?: Sourced<Money>
  readonly statementDate?: LocalDate
  readonly minPaymentRule?: MinPaymentRule
  readonly purchaseApr?: Sourced<Rate>
  readonly cashAdvanceApr?: Sourced<Rate>
  readonly dueDate?: LocalDate
  readonly graceDays?: number
}

export interface CreditCard extends ObligationBase {
  readonly kind: 'creditCard'
  readonly cardDetails: CardDetails
}

// ─── Generic facility (read-only, limited support — FR-OBL-009) ───────────────

export interface GenericFacility extends ObligationBase {
  readonly kind: 'genericFacility'
  readonly outstandingBalance?: Sourced<Money>
}

// ─── Ijara / Diminishing Musharakah (P1 full support — FR-OBL-010) ───────────

export interface IjaraFinancing extends ObligationBase {
  readonly kind: 'ijara'
  readonly outstandingBalance?: Sourced<Money>
}

export interface DiminishingMusharakahFinancing extends ObligationBase {
  readonly kind: 'diminishingMusharakah'
  readonly outstandingBalance?: Sourced<Money>
}

// ─── Discriminated union ──────────────────────────────────────────────────────

export type Obligation =
  | ConventionalLoan
  | MurabahaFinancing
  | CreditCard
  | GenericFacility
  | IjaraFinancing
  | DiminishingMusharakahFinancing

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isConventionalLoan(o: Obligation): o is ConventionalLoan {
  return o.kind === 'conventionalLoan'
}

export function isMurabaha(o: Obligation): o is MurabahaFinancing {
  return o.kind === 'murabaha'
}

export function isCreditCard(o: Obligation): o is CreditCard {
  return o.kind === 'creditCard'
}
