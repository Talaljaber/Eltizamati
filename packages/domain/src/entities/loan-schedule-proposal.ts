import type { Id } from '../value-objects/id.js'
import type { LocalDate } from '../value-objects/id.js'

export type LoanScheduleProposalKind = 'recommended' | 'custom'
export type LoanScheduleProposalStatus = 'pending' | 'approved' | 'rejected' | 'superseded'

export interface LoanScheduleProposalRow {
  readonly period: number
  readonly date: LocalDate
  readonly payment: string
  readonly principal: string
  readonly cost: string
  readonly closingBalance: string
  readonly finalBalloonAmount?: string
}

export interface LoanScheduleProposalDraft {
  readonly obligationId: Id<'obligation'>
  readonly kind: LoanScheduleProposalKind
  readonly currency: string
  readonly asOf: LocalDate
  readonly proposedInstallment: string
  readonly projectedRemainingPayable: string
  readonly finalBalloon: string
  readonly rateHistorySnapshot: readonly {
    readonly annualRate: string
    readonly effectiveFrom: LocalDate
  }[]
  readonly schedule: readonly LoanScheduleProposalRow[]
}

export interface LoanScheduleProposal extends LoanScheduleProposalDraft {
  readonly id: Id<'loanScheduleProposal'>
  readonly userId: Id<'user'>
  readonly status: LoanScheduleProposalStatus
  readonly decisionReason?: string
  readonly decidedAt?: string
  readonly createdAt: string
  readonly updatedAt: string
}
