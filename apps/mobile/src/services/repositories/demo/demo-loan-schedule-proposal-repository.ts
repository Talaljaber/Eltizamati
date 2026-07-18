import {
  brandId,
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

  reset(): void {
    this.#store.length = 0
  }
}
