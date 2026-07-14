import { act, renderHook } from '@testing-library/react-native'
import { err, makeError, ok } from '@eltizamati/domain'
import { useEntryCompletion } from '../use-entry-completion'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

const mockReadLocalConsent = jest.fn()
const mockEnsurePersonalConsent = jest.fn()
jest.mock('../../consent-policy', () => ({
  readLocalConsent: () => mockReadLocalConsent(),
  isCurrentLocalConsent: () => true,
  ensurePersonalConsent: (...args: unknown[]) => mockEnsurePersonalConsent(...args),
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
const mockGetConsentRepository = jest.fn()
jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthServiceLazy: () => mockGetAuthService,
  useConsentRepositoryLazy: () => mockGetConsentRepository,
}))
jest.mock('@/features/auth/services/auth-boundary-events', () => ({
  notifyAuthBoundaryChanged: jest.fn(),
}))
jest.mock('@/services/local-notification-service', () => ({
  enableNotificationNavigation: jest.fn(),
}))

const SESSION = { user: { id: 'user-1', email: 'a@b.co' }, expiresAt: undefined }

describe('useEntryCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReadLocalConsent.mockResolvedValue(ok({ version: 'v1' }))
    mockEnsurePersonalConsent.mockResolvedValue(ok(undefined))
    mockSetDataMode.mockResolvedValue(undefined)
    mockSetOnboardingComplete.mockResolvedValue(undefined)
    mockBootDemo.mockResolvedValue(undefined)
    mockBootPersonal.mockResolvedValue(undefined)
    mockGetConsentRepository.mockReturnValue(ok({ status: jest.fn(), acknowledge: jest.fn() }))
    mockGetAuthService.mockReturnValue(
      ok({ currentSession: jest.fn().mockResolvedValue(ok(SESSION)) }),
    )
  })

  it('returns a typed failure and does not mark onboarding complete when demo boot fails', async () => {
    mockBootDemo.mockRejectedValue(makeError('storage'))
    const { result } = renderHook(() => useEntryCompletion())

    let completion: Awaited<ReturnType<typeof result.current.completeDemoEntry>> | undefined
    await act(async () => {
      completion = await result.current.completeDemoEntry()
    })

    expect(completion).toMatchObject({ ok: false })
    expect(mockSetOnboardingComplete).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('shares rapid demo completion calls and navigates only after the single boot settles', async () => {
    let resolveBoot: (() => void) | undefined
    mockBootDemo.mockReturnValue(new Promise<void>((resolve) => (resolveBoot = resolve)))
    const { result } = renderHook(() => useEntryCompletion())

    let first: Promise<unknown> | undefined
    let second: Promise<unknown> | undefined
    act(() => {
      first = result.current.completeDemoEntry()
      second = result.current.completeDemoEntry()
    })
    expect(first).toBe(second)
    expect(mockSetOnboardingComplete).not.toHaveBeenCalled()
    resolveBoot?.()
    await act(async () => {
      await first
    })

    expect(mockBootDemo).toHaveBeenCalledTimes(1)
    expect(mockSetOnboardingComplete).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/')
  })

  it('runs demo and personal entry exclusively — a concurrent pair cannot both mutate state', async () => {
    let resolveDemoBoot: (() => void) | undefined
    mockBootDemo.mockReturnValue(new Promise<void>((resolve) => (resolveDemoBoot = resolve)))
    const { result } = renderHook(() => useEntryCompletion())

    let demo: Promise<unknown> | undefined
    let personal: Promise<unknown> | undefined
    act(() => {
      demo = result.current.completeDemoEntry()
      personal = result.current.completePersonalEntry(SESSION)
    })
    // The second caller receives the first in-flight operation, not its own.
    expect(demo).toBe(personal)
    resolveDemoBoot?.()
    await act(async () => {
      await demo
    })

    // Only the demo path mutated global state; personal boot never ran.
    expect(mockSetDataMode).toHaveBeenCalledTimes(1)
    expect(mockSetDataMode).toHaveBeenCalledWith('demo')
    expect(mockBootPersonal).not.toHaveBeenCalled()
  })

  it('converts a thrown currentSession() into a typed Result during resume', async () => {
    mockGetAuthService.mockReturnValue(
      ok({ currentSession: jest.fn().mockRejectedValue(makeError('unexpected')) }),
    )
    const { result } = renderHook(() => useEntryCompletion())

    let completion: Awaited<ReturnType<typeof result.current.resumePersonalEntry>> | undefined
    await act(async () => {
      completion = await result.current.resumePersonalEntry()
    })

    expect(completion).toMatchObject({ ok: false })
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mockBootPersonal).not.toHaveBeenCalled()
  })

  it('resumes to sign-in when no session exists, then clears the slot for a later retry', async () => {
    mockGetAuthService.mockReturnValue(
      ok({ currentSession: jest.fn().mockResolvedValue(ok(undefined)) }),
    )
    const { result } = renderHook(() => useEntryCompletion())

    let completion: Awaited<ReturnType<typeof result.current.resumePersonalEntry>> | undefined
    await act(async () => {
      completion = await result.current.resumePersonalEntry()
    })

    expect(completion).toMatchObject({ ok: true, value: false })
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
  })

  it('clears the in-flight slot after failure so a retry can succeed', async () => {
    mockBootDemo.mockRejectedValueOnce(makeError('storage'))
    const { result } = renderHook(() => useEntryCompletion())

    let firstResult: Awaited<ReturnType<typeof result.current.completeDemoEntry>> | undefined
    await act(async () => {
      firstResult = await result.current.completeDemoEntry()
    })
    expect(firstResult).toMatchObject({ ok: false })

    mockBootDemo.mockResolvedValueOnce(undefined)
    let retryResult: Awaited<ReturnType<typeof result.current.completeDemoEntry>> | undefined
    await act(async () => {
      retryResult = await result.current.completeDemoEntry()
    })

    expect(retryResult).toMatchObject({ ok: true })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/')
  })

  it('never produces an unhandled rejection on failure', async () => {
    const unhandled = jest.fn()
    process.on('unhandledRejection', unhandled)
    mockGetConsentRepository.mockReturnValue(err(makeError('unexpected')))
    const { result } = renderHook(() => useEntryCompletion())

    await act(async () => {
      await result.current.completePersonalEntry(SESSION)
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })
})
