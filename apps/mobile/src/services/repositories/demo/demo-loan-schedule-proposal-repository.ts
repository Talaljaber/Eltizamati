import {
  brandId,
  err,
  makeError,
  ok,
  type AppError,
  type Id,
  type LoanScheduleProposal,
  type LoanScheduleProposalDraft,
  type LoanScheduleProposalRepository,
  type Result,
} from '@eltizamati/domain'
import { generateUuid } from '@/core/ids/generate-uuid'

export class DemoLoanScheduleProposalRepository implements LoanScheduleProposalRepository {
  readonly #store: LoanScheduleProposal[] = []

  async listFor(
    userId: Id<'user'>,
    obligationId: Id<'obligation'>,
  ): Promise<Result<readonly LoanScheduleProposal[], AppError>> {
    return ok(this.#store.filter((item) => item.userId === userId && item.obligationId === obligationId))
  }

  async submit(
    userId: Id<'user'>,
    draft: LoanScheduleProposalDraft,
  ): Promise<Result<LoanScheduleProposal, AppError>> {
    const now = new Date().toISOString()
    const proposal: LoanScheduleProposal = {
      ...draft,
      id: brandId<'loanScheduleProposal'>(generateUuid()),
      userId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    this.#store.unshift(proposal)
    return ok(proposal)
  }

  async selfApprove(
    userId: Id<'user'>,
    proposalId: Id<'loanScheduleProposal'>,
  ): Promise<Result<LoanScheduleProposal, AppError>> {
    const index = this.#store.findIndex(
      (item) => item.id === proposalId && item.userId === userId,
    )
    if (index === -1) {
      return err(makeError('notFound', { safeMetadata: { proposalId } }))
    }
    const proposal = this.#store[index]
    if (proposal === undefined || proposal.status !== 'pending') {
      return err(makeError('validation', { safeMetadata: { reason: 'notPending' } }))
    }
    const now = new Date().toISOString()
    for (let i = 0; i < this.#store.length; i += 1) {
      const item = this.#store[i]
      if (item !== undefined && item.obligationId === proposal.obligationId && item.status === 'approved') {
        this.#store[i] = { ...item, status: 'superseded', decidedAt: now, updatedAt: now }
      }
    }
    const approved: LoanScheduleProposal = {
      ...proposal,
      status: 'approved',
      decidedAt: now,
      updatedAt: now,
    }
    this.#store[index] = approved
    return ok(approved)
  }

  reset(): void {
    this.#store.length = 0
  }
}
