/**
 * In-memory demo loan-application repository (ADR-0017 §2). No Supabase, no
 * admin side — a submitted application simply stays `pending` (there is no
 * dashboard in demo mode to decide it), which is enough to exercise the
 * submit + history-list flow locally. No Supabase imports — enforced by
 * depcruise.
 */
import {
  brandId,
  ok,
  type AppError,
  type Id,
  type LoanApplication,
  type LoanApplicationDraft,
  type LoanApplicationRepository,
  type Result,
} from '@eltizamati/domain'
import { generateUuid } from '@/core/ids/generate-uuid'

export class DemoLoanApplicationRepository implements LoanApplicationRepository {
  readonly #store = new Map<string, LoanApplication>()

  async list(userId: Id<'user'>): Promise<Result<readonly LoanApplication[], AppError>> {
    const applications = [...this.#store.values()]
      .filter((a) => a.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    return ok(applications)
  }

  async submit(
    userId: Id<'user'>,
    draft: LoanApplicationDraft,
  ): Promise<Result<LoanApplication, AppError>> {
    const now = new Date().toISOString()
    const application: LoanApplication = {
      id: brandId<'loanApplication'>(generateUuid()),
      userId,
      institutionName: draft.institutionName,
      purpose: draft.purpose,
      requestedAmount: draft.requestedAmount,
      requestedTermMonths: draft.requestedTermMonths,
      ...(draft.applicantNote !== undefined ? { applicantNote: draft.applicantNote } : {}),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    this.#store.set(application.id, application)
    return ok(application)
  }

  reset(): void {
    this.#store.clear()
  }
}
