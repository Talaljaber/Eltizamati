import { brandId, err, makeError, ok, type UserProfile } from '@eltizamati/domain'
import {
  __resetProfileProvisioningForTest,
  ensureAuthenticatedUserProfile,
} from '../ensure-authenticated-user-profile'

const session = {
  user: { id: 'user-1', email: 'user@example.com' },
  expiresAt: undefined,
}
const timestamp = '2026-07-15T10:00:00.000Z'

function makeRepository(existing?: UserProfile) {
  let stored = existing
  return {
    get: jest.fn(async () => (stored === undefined ? err(makeError('notFound')) : ok(stored))),
    createIfAbsent: jest.fn(async (profile: UserProfile) => {
      stored ??= profile
      return ok(stored)
    }),
    save: jest.fn(async (profile: UserProfile) => {
      stored = profile
      return ok(profile)
    }),
    markBankConnectComplete: jest.fn(async (_userId: string, version: string) => {
      stored = stored === undefined ? stored : { ...stored, bankConnectOnboardingVersion: version }
      return stored === undefined ? err(makeError('notFound')) : ok(stored)
    }),
  }
}

describe('ensureAuthenticatedUserProfile', () => {
  beforeEach(() => __resetProfileProvisioningForTest())

  it('creates a personal profile only for a verified session', async () => {
    const repository = makeRepository()
    const result = await ensureAuthenticatedUserProfile(
      session,
      'ar',
      repository,
      {},
      () => new Date(timestamp),
    )

    expect(result).toEqual({
      ok: true,
      value: {
        userId: brandId('user-1'),
        locale: 'ar',
        dataMode: 'personal',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    })
    expect(repository.createIfAbsent).toHaveBeenCalledTimes(1)
  })

  it('stores approved signup details on a new profile', async () => {
    const repository = makeRepository()
    const result = await ensureAuthenticatedUserProfile(session, 'en', repository, {
      fullName: 'Talal Example',
      phoneNumber: '+962791234567',
      primaryBank: 'Example Bank',
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        fullName: 'Talal Example',
        phoneNumber: '+962791234567',
        primaryBank: 'Example Bank',
      },
    })
  })

  it('preserves every existing profile field and preference', async () => {
    const existing: UserProfile = {
      userId: brandId('user-1'),
      locale: 'en',
      dataMode: 'personal',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      reminderDayOfMonth: 12,
      userThresholdAmount: '250.00',
      fullName: 'Existing Name',
      phoneNumber: '+962790000000',
      primaryBank: 'Existing Bank',
    }
    const repository = makeRepository(existing)
    const result = await ensureAuthenticatedUserProfile(session, 'ar', repository)

    expect(result).toEqual(ok(existing))
    expect(repository.createIfAbsent).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('repairs a legacy auth user with no profile', async () => {
    const repository = makeRepository()
    const result = await ensureAuthenticatedUserProfile(session, 'en', repository)

    expect(result.ok).toBe(true)
    expect(repository.createIfAbsent).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent ensure calls', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const repository = makeRepository()
    repository.get.mockImplementation(async () => {
      await gate
      return err(makeError('notFound'))
    })

    const first = ensureAuthenticatedUserProfile(session, 'en', repository)
    const second = ensureAuthenticatedUserProfile(session, 'en', repository)
    expect(first).toBe(second)
    release?.()
    await Promise.all([first, second])

    expect(repository.get).toHaveBeenCalledTimes(1)
    expect(repository.createIfAbsent).toHaveBeenCalledTimes(1)
  })

  it('returns a typed failure and allows a later retry', async () => {
    const repository = makeRepository()
    repository.createIfAbsent
      .mockResolvedValueOnce(err(makeError('authorization')) as never)
      .mockImplementationOnce(async (profile: UserProfile) => ok(profile))

    const first = await ensureAuthenticatedUserProfile(session, 'en', repository)
    const retry = await ensureAuthenticatedUserProfile(session, 'en', repository)

    expect(first).toMatchObject({ ok: false, error: { code: 'authorization' } })
    expect(retry.ok).toBe(true)
    expect(repository.createIfAbsent).toHaveBeenCalledTimes(2)
  })
})
