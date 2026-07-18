import {
  brandId,
  DomainInvariantError,
  toCanonicalJsonValue,
  toLocalDate,
  type Id,
  type LoanScheduleProposal,
  type LoanScheduleProposalDraft,
  type LoanScheduleProposalKind,
  type LoanScheduleProposalRow,
  type LoanScheduleProposalStatus,
} from '@eltizamati/domain'
import type { Database, Json } from '@/core/supabase/database.types'

type ProposalRow = Database['public']['Tables']['loan_schedule_proposals']['Row']
type ProposalInsert = Database['public']['Tables']['loan_schedule_proposals']['Insert']

function kind(value: string): LoanScheduleProposalKind {
  if (value === 'recommended' || value === 'custom') return value
  throw new DomainInvariantError('validation', `Unexpected schedule proposal kind: ${value}`)
}

function status(value: string): LoanScheduleProposalStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'superseded') {
    return value
  }
  throw new DomainInvariantError('validation', `Unexpected schedule proposal status: ${value}`)
}

function scheduleRows(value: Json): readonly LoanScheduleProposalRow[] {
  if (!Array.isArray(value)) throw new DomainInvariantError('validation', 'Invalid proposal schedule')
  return value.map((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new DomainInvariantError('validation', 'Invalid proposal schedule row')
    }
    const row = item as Record<string, Json | undefined>
    if (
      typeof row.period !== 'number' ||
      typeof row.date !== 'string' ||
      typeof row.payment !== 'string' ||
      typeof row.principal !== 'string' ||
      typeof row.cost !== 'string' ||
      typeof row.closingBalance !== 'string'
    ) {
      throw new DomainInvariantError('validation', 'Incomplete proposal schedule row')
    }
    return {
      period: row.period,
      date: toLocalDate(row.date),
      payment: row.payment,
      principal: row.principal,
      cost: row.cost,
      closingBalance: row.closingBalance,
      ...(typeof row.finalBalloonAmount === 'string'
        ? { finalBalloonAmount: row.finalBalloonAmount }
        : {}),
    }
  })
}

export function scheduleProposalRowToDomain(row: ProposalRow): LoanScheduleProposal {
  const rates = Array.isArray(row.rate_history_snapshot) ? row.rate_history_snapshot : []
  return {
    id: brandId<'loanScheduleProposal'>(row.id),
    userId: brandId<'user'>(row.user_id),
    obligationId: brandId<'obligation'>(row.obligation_id),
    kind: kind(row.proposal_kind),
    status: status(row.status),
    currency: row.currency,
    asOf: toLocalDate(row.as_of),
    proposedInstallment: String(row.proposed_installment),
    projectedRemainingPayable: String(row.projected_remaining_payable),
    finalBalloon: String(row.final_balloon),
    rateHistorySnapshot: rates.flatMap((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
      const rate = item as Record<string, Json | undefined>
      return typeof rate.annualRate === 'string' && typeof rate.effectiveFrom === 'string'
        ? [{ annualRate: rate.annualRate, effectiveFrom: toLocalDate(rate.effectiveFrom) }]
        : []
    }),
    schedule: scheduleRows(row.schedule_snapshot),
    ...(row.decision_reason !== null ? { decisionReason: row.decision_reason } : {}),
    ...(row.decided_at !== null ? { decidedAt: row.decided_at } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function scheduleProposalDraftToRow(
  id: Id<'loanScheduleProposal'>,
  userId: Id<'user'>,
  draft: LoanScheduleProposalDraft,
): ProposalInsert {
  const rateSnapshot = toCanonicalJsonValue(draft.rateHistorySnapshot)
  const scheduleSnapshot = toCanonicalJsonValue(draft.schedule)
  if (!rateSnapshot.ok || !scheduleSnapshot.ok) {
    throw new DomainInvariantError('validation', 'Schedule proposal is not serializable')
  }
  return {
    id,
    user_id: userId,
    obligation_id: draft.obligationId,
    proposal_kind: draft.kind,
    currency: draft.currency,
    as_of: draft.asOf,
    proposed_installment: Number(draft.proposedInstallment),
    projected_remaining_payable: Number(draft.projectedRemainingPayable),
    final_balloon: Number(draft.finalBalloon),
    rate_history_snapshot: rateSnapshot.value as Json,
    schedule_snapshot: scheduleSnapshot.value as Json,
  }
}
