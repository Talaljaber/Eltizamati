/**
 * LoanApplication — a mobile user's request to open a new conventional loan,
 * reviewed by an admin on the bank simulator dashboard (schema:
 * supabase/migrations/20260716030000_loan_applications.sql). The applicant
 * only ever creates a `pending` application and reads their own; the
 * approve/reject transition — and the resulting obligation on approval —
 * happens only through the dashboard's service-role RPC, never from the app.
 */
import type { Id } from '../value-objects/id.js'
import type { LoanPurpose } from './obligation.js'

export type LoanApplicationStatus = 'pending' | 'approved' | 'rejected'

/** What the applicant submits — the only fields the mobile app controls. */
export interface LoanApplicationDraft {
  readonly institutionName: string
  readonly purpose: LoanPurpose
  /** JOD, stored as a decimal string (BR-MONEY discipline). */
  readonly requestedAmount: string
  readonly requestedTermMonths: number
  readonly applicantNote?: string
}

export interface LoanApplication {
  readonly id: Id<'loanApplication'>
  readonly userId: Id<'user'>
  readonly institutionName: string
  readonly purpose: LoanPurpose
  readonly requestedAmount: string
  readonly requestedTermMonths: number
  readonly applicantNote?: string
  readonly status: LoanApplicationStatus
  /** Present only once approved — the admin's decided terms. */
  readonly approvedAmount?: string
  readonly approvedTermMonths?: number
  /** Annual rate as a decimal string (e.g. "0.089" for 8.9%), matching rate_periods.annual_rate. */
  readonly approvedAnnualRate?: string
  readonly resultingObligationId?: Id<'obligation'>
  /** Present only once rejected. */
  readonly decisionReason?: string
  readonly decidedAt?: string
  readonly createdAt: string
  readonly updatedAt: string
}
