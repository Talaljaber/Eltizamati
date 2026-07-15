import { brandId, isErr, isOk, type UserProfile } from '@eltizamati/domain'
import { SupabaseUserProfileRepository } from '../user-profile-repository'

const row = {
  user_id: 'a0000000-0000-0000-0000-00000000000a',
  locale: 'en',
  data_mode: 'personal',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-02T00:00:00.000Z',
  full_name: null,
  phone_number: null,
  primary_bank: null,
}

const profile: UserProfile = {
  userId: brandId('a0000000-0000-0000-0000-00000000000a'),
  locale: 'en',
  dataMode: 'personal',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
}

interface FakeQueryBuilder {
  select: jest.Mock<FakeQueryBuilder, [string]>
  eq: jest.Mock<FakeQueryBuilder, [string, string]>
  upsert: jest.Mock<FakeQueryBuilder, [unknown]>
  insert: jest.Mock<FakeQueryBuilder, [unknown]>
  maybeSingle: jest.Mock<Promise<unknown>, []>
  single: jest.Mock<Promise<unknown>, []>
}

/** Minimal chainable fake matching only the subset of the fluent API this repository calls. */
function makeFakeClient(options: { maybeSingle?: unknown; single?: unknown }) {
  const builder: FakeQueryBuilder = {
    select: jest.fn(),
    eq: jest.fn(),
    upsert: jest.fn(),
    insert: jest.fn(),
    maybeSingle: jest.fn(() => Promise.resolve(options.maybeSingle)),
    single: jest.fn(() => Promise.resolve(options.single)),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.upsert.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)

  return {
    from: jest.fn(() => builder),
    builder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, not production code
  } as any
}

describe('SupabaseUserProfileRepository', () => {
  describe('get', () => {
    it('returns ok(UserProfile) when a row is found', async () => {
      const client = makeFakeClient({ maybeSingle: { data: row, error: null } })
      const repo = new SupabaseUserProfileRepository(client)

      const result = await repo.get(profile.userId)

      expect(isOk(result)).toBe(true)
      if (isOk(result)) expect(result.value).toEqual(profile)
      expect(client.from).toHaveBeenCalledWith('profiles')
      expect(client.builder.eq).toHaveBeenCalledWith('user_id', profile.userId)
    })

    it('returns a notFound AppError when no row matches', async () => {
      const client = makeFakeClient({ maybeSingle: { data: null, error: null } })
      const repo = new SupabaseUserProfileRepository(client)

      const result = await repo.get(profile.userId)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) expect(result.error.code).toBe('notFound')
    })

    it('returns an authorization AppError when RLS denies the query', async () => {
      const client = makeFakeClient({
        maybeSingle: { data: null, error: { code: '42501', message: 'permission denied' } },
      })
      const repo = new SupabaseUserProfileRepository(client)

      const result = await repo.get(profile.userId)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe('authorization')
        expect(result.error.safeMetadata).toEqual({ providerCode: '42501' })
      }
    })
  })

  describe('save', () => {
    it('upserts the mapped row and returns ok(UserProfile) on success', async () => {
      const client = makeFakeClient({ single: { data: row, error: null } })
      const repo = new SupabaseUserProfileRepository(client)

      const result = await repo.save(profile)

      expect(isOk(result)).toBe(true)
      if (isOk(result)) expect(result.value).toEqual(profile)
      expect(client.builder.upsert).toHaveBeenCalledWith({
        user_id: profile.userId,
        locale: profile.locale,
        data_mode: profile.dataMode,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
        reminder_day_of_month: null,
        user_threshold_amount: null,
        full_name: null,
        phone_number: null,
        primary_bank: null,
      })
    })

    it('returns a storage AppError when the upsert fails', async () => {
      const client = makeFakeClient({
        single: { data: null, error: { code: '23505', message: 'duplicate key' } },
      })
      const repo = new SupabaseUserProfileRepository(client)

      const result = await repo.save(profile)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) expect(result.error.code).toBe('storage')
    })
  })

  describe('createIfAbsent', () => {
    it('inserts without upserting existing preferences', async () => {
      const client = makeFakeClient({ single: { data: row, error: null } })
      const result = await new SupabaseUserProfileRepository(client).createIfAbsent(profile)

      expect(isOk(result)).toBe(true)
      expect(client.builder.insert).toHaveBeenCalledTimes(1)
      expect(client.builder.upsert).not.toHaveBeenCalled()
    })

    it('re-reads the winning profile on a uniqueness race', async () => {
      const client = makeFakeClient({
        single: { data: null, error: { code: '23505', message: 'duplicate key' } },
        maybeSingle: { data: row, error: null },
      })
      const result = await new SupabaseUserProfileRepository(client).createIfAbsent(profile)

      expect(isOk(result)).toBe(true)
      expect(client.builder.maybeSingle).toHaveBeenCalledTimes(1)
    })
  })
})
