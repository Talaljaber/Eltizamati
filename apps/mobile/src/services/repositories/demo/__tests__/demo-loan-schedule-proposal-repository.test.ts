import { brandId, toLocalDate, type LoanScheduleProposalDraft } from '@eltizamati/domain'
import { DemoLoanScheduleProposalRepository } from '../demo-loan-schedule-proposal-repository'

const userId = brandId<'user'>('demo-user')
const obligationId = brandId<'obligation'>('demo-obligation')

function draft(overrides: Partial<LoanScheduleProposalDraft> = {}): LoanScheduleProposalDraft {
  return {
    obligationId,
    kind: 'recommended',
    currency: 'JOD',
    asOf: toLocalDate('2026-07-18'),
    proposedInstallment: '350',
    projectedRemainingPayable: '8400',
    finalBalloon: '0',
    rateHistorySnapshot: [],
    schedule: [
      {
        period: 1,
        date: toLocalDate('2026-08-01'),
        payment: '350',
        principal: '320',
        cost: '30',
        closingBalance: '7680',
      },
    ],
    ...overrides,
  }
}

describe('DemoLoanScheduleProposalRepository.selfApprove', () => {
  it('approves the customer-owned pending proposal', async () => {
    const repo = new DemoLoanScheduleProposalRepository()
    const submitResult = await repo.submit(userId, draft())
    expect(submitResult.ok).toBe(true)
    if (!submitResult.ok) return

    const approveResult = await repo.selfApprove(userId, submitResult.value.id)
    expect(approveResult.ok).toBe(true)
    if (!approveResult.ok) return
    expect(approveResult.value.status).toBe('approved')
    expect(approveResult.value.decidedAt).toBeDefined()
  })

  it('supersedes a previously approved proposal for the same obligation', async () => {
    const repo = new DemoLoanScheduleProposalRepository()
    const first = await repo.submit(userId, draft())
    const second = await repo.submit(userId, draft({ proposedInstallment: '360' }))
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    await repo.selfApprove(userId, first.value.id)
    await repo.selfApprove(userId, second.value.id)

    const listResult = await repo.listFor(userId, obligationId)
    expect(listResult.ok).toBe(true)
    if (!listResult.ok) return
    const firstAfter = listResult.value.find((p) => p.id === first.value.id)
    const secondAfter = listResult.value.find((p) => p.id === second.value.id)
    expect(firstAfter?.status).toBe('superseded')
    expect(secondAfter?.status).toBe('approved')
  })

  it('rejects approving a proposal that is not pending', async () => {
    const repo = new DemoLoanScheduleProposalRepository()
    const submitResult = await repo.submit(userId, draft())
    expect(submitResult.ok).toBe(true)
    if (!submitResult.ok) return

    await repo.selfApprove(userId, submitResult.value.id)
    const secondApprove = await repo.selfApprove(userId, submitResult.value.id)
    expect(secondApprove.ok).toBe(false)
  })

  it('rejects approving another user\'s proposal', async () => {
    const repo = new DemoLoanScheduleProposalRepository()
    const submitResult = await repo.submit(userId, draft())
    expect(submitResult.ok).toBe(true)
    if (!submitResult.ok) return

    const otherUser = brandId<'user'>('someone-else')
    const result = await repo.selfApprove(otherUser, submitResult.value.id)
    expect(result.ok).toBe(false)
  })
})
