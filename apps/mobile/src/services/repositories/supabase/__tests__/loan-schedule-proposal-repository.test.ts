import {
  brandId,
  isErr,
  isOk,
  toLocalDate,
  type LoanScheduleProposalDraft,
} from '@eltizamati/domain'
import { SupabaseLoanScheduleProposalRepository } from '../loan-schedule-proposal-repository'

const userId = brandId<'user'>('a0000000-0000-0000-0000-00000000000a')
const obligationId = brandId<'obligation'>('10000000-0000-0000-0000-000000000001')

const row = {
  id: '20000000-0000-0000-0000-000000000001',
  obligation_id: obligationId,
  user_id: userId,
  proposal_kind: 'recommended',
  status: 'pending',
  currency: 'JOD',
  as_of: '2026-07-01',
  proposed_installment: 180,
  projected_remaining_payable: 0,
  final_balloon: 0,
  rate_history_snapshot: [{ annualRate: '0.08', effectiveFrom: '2026-06-01' }],
  schedule_snapshot: [
    {
      period: 1,
      date: '2026-08-01',
      payment: '180',
      principal: '170',
      cost: '10',
      closingBalance: '0',
    },
  ],
  decision_reason: null,
  decided_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
}

const draft: LoanScheduleProposalDraft = {
  obligationId,
  kind: 'recommended',
  currency: 'JOD',
  asOf: toLocalDate('2026-07-01'),
  proposedInstallment: '180',
  projectedRemainingPayable: '0',
  finalBalloon: '0',
  rateHistorySnapshot: [],
  schedule: [
    {
      period: 1,
      date: toLocalDate('2026-08-01'),
      payment: '180',
      principal: '170',
      cost: '10',
      closingBalance: '0',
    },
  ],
}

interface FakeQueryBuilder {
  select: jest.Mock<FakeQueryBuilder, [string]>
  eq: jest.Mock<FakeQueryBuilder, [string, string]>
  order: jest.Mock<Promise<unknown>, [string, unknown]>
  insert: jest.Mock<FakeQueryBuilder, [unknown]>
  single: jest.Mock<Promise<unknown>, []>
}

function makeFakeClient(options: { list?: unknown; single?: unknown }) {
  const builder: FakeQueryBuilder = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn((_column: string, _opts: unknown) => Promise.resolve(options.list)),
    insert: jest.fn(),
    single: jest.fn(() => Promise.resolve(options.single)),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)

  return {
    from: jest.fn(() => builder),
    builder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, not production code
  } as any
}

describe('SupabaseLoanScheduleProposalRepository', () => {
  describe('submit', () => {
    it('returns ok on success', async () => {
      const client = makeFakeClient({ single: { data: row, error: null } })
      const repo = new SupabaseLoanScheduleProposalRepository(client)

      const result = await repo.submit(userId, draft)

      expect(isOk(result)).toBe(true)
    })

    it('maps a unique_violation on the one-pending-per-obligation index to a distinguishable "alreadyPending" reason', async () => {
      const client = makeFakeClient({
        single: {
          data: null,
          error: {
            code: '23505',
            message:
              'duplicate key value violates unique constraint "loan_schedule_proposals_one_pending_idx"',
          },
        },
      })
      const repo = new SupabaseLoanScheduleProposalRepository(client)

      const result = await repo.submit(userId, draft)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe('validation')
        expect(result.error.safeMetadata).toEqual({ reason: 'alreadyPending' })
      }
    })

    it('routes every other Postgres failure through the shared classifier instead of guessing "alreadyPending"', async () => {
      const client = makeFakeClient({
        single: { data: null, error: { code: '42501', message: 'permission denied' } },
      })
      const repo = new SupabaseLoanScheduleProposalRepository(client)

      const result = await repo.submit(userId, draft)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe('authorization')
        expect(result.error.safeMetadata).toEqual({ providerCode: '42501' })
      }
    })
  })

  describe('listFor', () => {
    it('returns ok(list) on success', async () => {
      const client = makeFakeClient({ list: { data: [row], error: null } })
      const repo = new SupabaseLoanScheduleProposalRepository(client)

      const result = await repo.listFor(userId, obligationId)

      expect(isOk(result)).toBe(true)
      if (isOk(result)) expect(result.value).toHaveLength(1)
    })
  })
})
