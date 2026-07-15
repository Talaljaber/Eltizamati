import { act, renderHook } from '@testing-library/react-native'
import { err, makeError, ok } from '@eltizamati/domain'
import { useEntryCompletion } from '../use-entry-completion'
import { __resetEntrySingleFlightForTest } from '../../services/entry-single-flight'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}))

const mockReadLocalConsent = jest.fn()
jest.mock('../../consent-policy', () => ({
  readLocalConsent: () => mockReadLocalConsent(),
  isCurrentLocalConsent: () => true,
}))

const mockSetDataMode = jest.fn()
const mockSetOnboardingComplete = jest.fn()
jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  setDataMode: (...args: unknown[]) => mockSetDataMode(...args),
  setOnboardingComplete: () => mockSetOnboardingComplete(),
}))

const mockBootDemo = jest.fn()
const mockBootPersonal = jest.fn()
jest.mock('@/providers', () => ({
  useDemoBoot: () => mockBootDemo,
  usePersonalBoot: () => mockBootPersonal,
}))

const mockGetAuthService = jest.fn()
const mockGetPersonalRepositories = jest.fn()
jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthServiceLazy: () => mockGetAuthService,
  usePersonalRepositoriesLazy: () => mockGetPersonalRepositories,
}))

const mockPreparePersonalEntry = jest.fn()
jest.mock('../../services/prepare-personal-entry', () => ({
  preparePersonalEntry: (...args: unknown[]) => mockPreparePersonalEntry(...args),
}))

const SESSION = { user: { id: 'user-1', email: 'a@b.co' }, expiresAt: undefined }
const repositories = { userProfileRepository: {}, consentRepository: {} }

describe('useEntryCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetEntrySingleFlightForTest()
    mockReadLocalConsent.mockResolvedValue(ok({ version: 'v1' }))
    mockSetDataMode.mockResolvedValue(undefined)
    mockSetOnboardingComplete.mockResolvedValue(undefined)
    mockBootDemo.mockResolvedValue(undefined)
    mockBootPersonal.mockResolvedValue(undefined)
    mockGetPersonalRepositories.mockReturnValue(ok(repositories))
    mockGetAuthService.mockReturnValue(
      ok({ currentSession: jest.fn().mockResolvedValue(ok(SESSION)) }),
    )
    mockPreparePersonalEntry.mockResolvedValue(ok('ready'))
  })

  it('shares entry work globally across hook instances', async () => {
    let release: (() => void) | undefined
    mockBootDemo.mockReturnValue(new Promise<void>((resolve) => (release = resolve)))
    const firstHook = renderHook(() => useEntryCompletion())
    const secondHook = renderHook(() => useEntryCompletion())

    let first: Promise<unknown> | undefined
    let second: Promise<unknown> | undefined
    act(() => {
      first = firstHook.result.current.completeDemoEntry()
      second = secondHook.result.current.completePersonalEntry(SESSION)
    })

    expect(first).toBe(second)
    release?.()
    await act(async () => {
      await first
    })
    expect(mockBootDemo).toHaveBeenCalledTimes(1)
    expect(mockPreparePersonalEntry).not.toHaveBeenCalled()
  })

  it('prepares profile, consent, and repositories before navigating Home', async () => {
    const { result } = renderHook(() => useEntryCompletion())

    await act(async () => {
      await result.current.completePersonalEntry(SESSION)
    })

    expect(mockPreparePersonalEntry).toHaveBeenCalledWith({
      session: SESSION,
      locale: 'en',
      repositories,
      bootPersonalMode: mockBootPersonal,
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/')
  })

  it('routes to consent without entering Home when consent is required', async () => {
    mockPreparePersonalEntry.mockResolvedValue(ok('consentRequired'))
    const { result } = renderHook(() => useEntryCompletion())

    await act(async () => {
      await result.current.completePersonalEntry(SESSION)
    })

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/consent?next=personal')
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/')
  })

  it('blocks Home on provisioning/preparation failure and allows retry', async () => {
    mockPreparePersonalEntry
      .mockResolvedValueOnce(err(makeError('storage')))
      .mockResolvedValueOnce(ok('ready'))
    const { result } = renderHook(() => useEntryCompletion())

    let first: unknown
    await act(async () => {
      first = await result.current.completePersonalEntry(SESSION)
    })
    expect(first).toMatchObject({ ok: false })
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/')

    await act(async () => {
      await result.current.completePersonalEntry(SESSION)
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/')
  })

  it('restores a valid session without requesting another OTP', async () => {
    const { result } = renderHook(() => useEntryCompletion())
    await act(async () => {
      await result.current.resumePersonalEntry()
    })

    expect(mockPreparePersonalEntry).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/')
  })

  it('routes a missing restored session to email entry', async () => {
    mockGetAuthService.mockReturnValue(
      ok({ currentSession: jest.fn().mockResolvedValue(ok(undefined)) }),
    )
    const { result } = renderHook(() => useEntryCompletion())
    await act(async () => {
      await result.current.resumePersonalEntry()
    })

    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
    expect(mockPreparePersonalEntry).not.toHaveBeenCalled()
  })
})
