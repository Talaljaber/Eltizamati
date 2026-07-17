/**
 * Loan-application reads/decisions for the dashboard review queue. Reads are
 * allowlist-gated (every query filters to `assertAllowlistConfigured()`'s
 * user-id list, like every other dashboard read). The approve/reject write
 * goes through the `demo_decide_loan_application` SECURITY DEFINER RPC — this
 * module never issues a raw UPDATE that transitions an application's status.
 */
import { err, ok, makeError, type AppError, type Result } from '@eltizamati/domain'
import { assertAllowlistConfigured } from '../allowlist'
import { getServiceRoleSupabaseClient } from '../supabase/client'

export interface LoanApplicationRow {
  readonly id: string
  readonly userId: string
  readonly institutionName: string
  readonly purpose: string
  readonly requestedAmount: number
  readonly requestedTermMonths: number
  readonly applicantNote: string | null
  readonly status: string
  readonly approvedAmount: number | null
  readonly approvedTermMonths: number | null
  readonly approvedAnnualRate: number | null
  readonly resultingObligationId: string | null
  readonly decisionReason: string | null
  readonly decidedAt: string | null
  readonly createdAt: string
}

interface DbRow {
  id: string
  user_id: string
  institution_name: string
  purpose: string
  requested_amount: number
  requested_term_months: number
  applicant_note: string | null
  status: string
  approved_amount: number | null
  approved_term_months: number | null
  approved_annual_rate: number | null
  resulting_obligation_id: string | null
  decision_reason: string | null
  decided_at: string | null
  created_at: string
}

function toDomain(row: DbRow): LoanApplicationRow {
  return {
    id: row.id,
    userId: row.user_id,
    institutionName: row.institution_name,
    purpose: row.purpose,
    requestedAmount: row.requested_amount,
    requestedTermMonths: row.requested_term_months,
    applicantNote: row.applicant_note,
    status: row.status,
    approvedAmount: row.approved_amount,
    approvedTermMonths: row.approved_term_months,
    approvedAnnualRate: row.approved_annual_rate,
    resultingObligationId: row.resulting_obligation_id,
    decisionReason: row.decision_reason,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  }
}

export async function listAllowlistedLoanApplications(): Promise<
  Result<readonly LoanApplicationRow[], AppError>
> {
  const allowedUserIds = assertAllowlistConfigured()

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('loan_applications')
    .select('*')
    .in('user_id', allowedUserIds)
    .order('created_at', { ascending: false })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(toDomain))
}

export interface DecideLoanApplicationInput {
  readonly applicationId: string
  readonly decision: 'approve' | 'reject'
  /** Decimal strings for the approved terms — only used on approve. */
  readonly approvedAmount?: string
  readonly approvedTermMonths?: number
  readonly approvedAnnualRateDecimal?: string
  readonly decisionReason?: string
}

export async function decideLoanApplication(
  input: DecideLoanApplicationInput,
): Promise<Result<LoanApplicationRow, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.rpc('demo_decide_loan_application', {
    p_application_id: input.applicationId,
    p_decision: input.decision,
    p_approved_amount: input.approvedAmount !== undefined ? Number(input.approvedAmount) : null,
    p_approved_term_months: input.approvedTermMonths ?? null,
    p_approved_annual_rate:
      input.approvedAnnualRateDecimal !== undefined
        ? Number(input.approvedAnnualRateDecimal)
        : null,
    p_decision_reason: input.decisionReason ?? null,
  })

  if (error !== null) {
    return err(
      makeError('storage', {
        // The RPC's own `raise exception` text (e.g. "a rejection requires a reason")
        // lands in error.message — surfacing it explains *why* a decision failed.
        safeMetadata: { postgresErrorCode: error.code, postgresErrorMessage: error.message },
        cause: error,
      }),
    )
  }

  return ok(toDomain(data))
}
