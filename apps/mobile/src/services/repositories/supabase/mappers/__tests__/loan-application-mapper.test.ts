import { brandId } from '@eltizamati/domain'
import {
  loanApplicationDraftToRow,
  loanApplicationRowToDomain,
} from '../loan-application-mapper'
import type { Database } from '../../../../../core/supabase/database.types'

type LoanApplicationRow = Database['public']['Tables']['loan_applications']['Row']

const pendingRow: LoanApplicationRow = {
  id: '90000000-0000-0000-0000-000000000001',
  user_id: 'd0000000-0000-0000-0000-00000000000a',
  institution_name: 'Arab Bank',
  purpose: 'personal',
  requested_amount: 1200,
  requested_term_months: 12,
  applicant_note: null,
  status: 'pending',
  approved_amount: null,
  approved_annual_rate: null,
  approved_term_months: null,
  resulting_obligation_id: null,
  decision_reason: null,
  decided_at: null,
  created_at: '2026-07-16T00:00:00.000Z',
  updated_at: '2026-07-16T00:00:00.000Z',
}

describe('loan-application-mapper', () => {
  it('maps a pending row, omitting every decision-only field rather than setting it undefined', () => {
    const application = loanApplicationRowToDomain(pendingRow)
    expect(application.status).toBe('pending')
    expect(application.requestedAmount).toBe('1200')
    expect('approvedAmount' in application).toBe(false)
    expect('decisionReason' in application).toBe(false)
    expect('resultingObligationId' in application).toBe(false)
  })

  it('maps an approved row with its decided terms as decimal strings', () => {
    const application = loanApplicationRowToDomain({
      ...pendingRow,
      status: 'approved',
      approved_amount: 1000,
      approved_term_months: 24,
      approved_annual_rate: 0.089,
      resulting_obligation_id: '10000000-0000-0000-0000-000000000abc',
      decided_at: '2026-07-17T00:00:00.000Z',
    })
    expect(application.approvedAmount).toBe('1000')
    expect(application.approvedAnnualRate).toBe('0.089')
    expect(application.resultingObligationId).toBe('10000000-0000-0000-0000-000000000abc')
  })

  it('maps a rejected row with its reason', () => {
    const application = loanApplicationRowToDomain({
      ...pendingRow,
      status: 'rejected',
      decision_reason: 'Insufficient information',
      decided_at: '2026-07-17T00:00:00.000Z',
    })
    expect(application.status).toBe('rejected')
    expect(application.decisionReason).toBe('Insufficient information')
  })

  it('converts a draft to an insert, numeric-typing the requested amount', () => {
    const row = loanApplicationDraftToRow(brandId<'user'>('d0000000-0000-0000-0000-00000000000a'), {
      institutionName: 'Housing Bank for Trade and Finance',
      purpose: 'housing',
      requestedAmount: '50000',
      requestedTermMonths: 120,
    })
    expect(row.requested_amount).toBe(50000)
    expect(row.applicant_note).toBeNull()
    expect(row.institution_name).toBe('Housing Bank for Trade and Finance')
  })
})
