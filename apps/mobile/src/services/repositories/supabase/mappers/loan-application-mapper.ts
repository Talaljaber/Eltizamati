/**
 * loan_applications row -> LoanApplication mapper (read side) and
 * LoanApplicationDraft -> Insert (write side). Money columns are `numeric`
 * in Postgres (arriving as JS `number`); domain money/rate values are
 * decimal strings, so cross the boundary with `String(...)`/`Number(...)`
 * exactly as obligation-mapper.ts does — never construct a float in the
 * domain layer.
 */
import {
  brandId,
  DomainInvariantError,
  type Id,
  type LoanApplication,
  type LoanApplicationDraft,
  type LoanApplicationStatus,
  type LoanPurpose,
} from '@eltizamati/domain'
import type { Database } from '../../../../core/supabase/database.types'

type LoanApplicationRow = Database['public']['Tables']['loan_applications']['Row']
type LoanApplicationInsert = Database['public']['Tables']['loan_applications']['Insert']

function toPurpose(value: string): LoanPurpose {
  if (value === 'personal' || value === 'auto' || value === 'housing' || value === 'other') {
    return value
  }
  throw new DomainInvariantError('validation', `Unexpected loan_applications.purpose value: "${value}"`)
}

function toStatus(value: string): LoanApplicationStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected') return value
  throw new DomainInvariantError('validation', `Unexpected loan_applications.status value: "${value}"`)
}

export function loanApplicationRowToDomain(row: LoanApplicationRow): LoanApplication {
  return {
    id: brandId<'loanApplication'>(row.id),
    userId: brandId<'user'>(row.user_id),
    institutionName: row.institution_name,
    purpose: toPurpose(row.purpose),
    requestedAmount: String(row.requested_amount),
    requestedTermMonths: row.requested_term_months,
    ...(row.applicant_note !== null ? { applicantNote: row.applicant_note } : {}),
    status: toStatus(row.status),
    ...(row.approved_amount !== null ? { approvedAmount: String(row.approved_amount) } : {}),
    ...(row.approved_term_months !== null ? { approvedTermMonths: row.approved_term_months } : {}),
    ...(row.approved_annual_rate !== null
      ? { approvedAnnualRate: String(row.approved_annual_rate) }
      : {}),
    ...(row.resulting_obligation_id !== null
      ? { resultingObligationId: brandId<'obligation'>(row.resulting_obligation_id) }
      : {}),
    ...(row.decision_reason !== null ? { decisionReason: row.decision_reason } : {}),
    ...(row.decided_at !== null ? { decidedAt: row.decided_at } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Applicant-supplied draft -> a `pending` insert. The DB defaults status/timestamps. */
export function loanApplicationDraftToRow(
  userId: Id<'user'>,
  draft: LoanApplicationDraft,
): LoanApplicationInsert {
  return {
    user_id: userId,
    institution_name: draft.institutionName,
    purpose: draft.purpose,
    requested_amount: Number(draft.requestedAmount),
    requested_term_months: draft.requestedTermMonths,
    applicant_note: draft.applicantNote ?? null,
  }
}
