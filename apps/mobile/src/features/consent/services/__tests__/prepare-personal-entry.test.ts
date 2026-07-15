import { brandId, err, makeError, ok, type UserProfile } from '@eltizamati/domain'
import { preparePersonalEntry } from '../prepare-personal-entry'
import { __resetProfileProvisioningForTest } from '@/features/auth/services/ensure-authenticated-user-profile'

const order: string[] = []
const existingProfile: UserProfile = {
  userId: brandId('user-1'),
  locale: 'ar',
  dataMode: 'personal',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  reminderDayOfMonth: 9,
  userThresholdAmount: '120',
}

const mockSetDataMode = jest.fn(async () => {
  order.push('mode')
})
const mockSetOnboardingComplete = jest.fn(async () => {
  order.push('onboarding')
})
jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  setDataMode: () => mockSetDataMode(),
  setOnboardingComplete: () => mockSetOnboardingComplete(),
}))
jest.mock('@/features/auth/services/auth-boundary-events', () => ({
  notifyAuthBoundaryChanged: () => order.push('boundary'),
}))
const mockReadLocalConsent = jest.fn()
const mockEnsurePersonalConsent = jest.fn()
jest.mock('../../consent-policy', () => ({
  readLocalConsent: () => mockReadLocalConsent(),
  isCurrentLocalConsent: () => true,
  ensurePersonalConsent: (...args: unknown[]) => mockEnsurePersonalConsent(...args),
}))
jest.mock('@/services/local-notification-service', () => ({
  enableNotificationNavigation: () => order.push('notifications'),
}))

function makeRepositories(profile = existingProfile) {
  return {
    userProfileRepository: {
      get: jest.fn(async () => {
        order.push('profile')
        return ok(profile)
      }),
      createIfAbsent: jest.fn(async () => ok(profile)),
      save: jest.fn(async () => ok(profile)),
    },
    consentRepository: { status: jest.fn(), acknowledge: jest.fn() },
  }
}

describe('preparePersonalEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    order.length = 0
    __resetProfileProvisioningForTest()
    mockReadLocalConsent.mockImplementation(async () => {
      order.push('local-consent')
      return ok({ version: 'v1' })
    })
    mockEnsurePersonalConsent.mockImplementation(async () => {
      order.push('server-consent')
      return ok(undefined)
    })
  })

  it('preserves the strict profile-consent-repository-commit order', async () => {
    const repositories = makeRepositories()
    const bootPersonalMode = jest.fn(async () => {
      order.push('repositories-committed')
    })
    const result = await preparePersonalEntry({
      session: { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined },
      locale: 'en',
      repositories: repositories as never,
      bootPersonalMode,
    })

    expect(result).toEqual(ok('ready'))
    expect(order).toEqual([
      'mode',
      'boundary',
      'profile',
      'local-consent',
      'server-consent',
      'repositories-committed',
      'onboarding',
      'notifications',
    ])
    expect(repositories.userProfileRepository.createIfAbsent).not.toHaveBeenCalled()
  })

  it('blocks consent, repository commit, and Home preparation when profile provisioning fails', async () => {
    const repositories = makeRepositories()
    repositories.userProfileRepository.get.mockResolvedValue(
      err(makeError('authorization')) as never,
    )
    const bootPersonalMode = jest.fn()

    const result = await preparePersonalEntry({
      session: { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined },
      locale: 'en',
      repositories: repositories as never,
      bootPersonalMode,
    })

    expect(result).toMatchObject({ ok: false, error: { code: 'authorization' } })
    expect(mockEnsurePersonalConsent).not.toHaveBeenCalled()
    expect(bootPersonalMode).not.toHaveBeenCalled()
    expect(mockSetOnboardingComplete).not.toHaveBeenCalled()
  })
})
