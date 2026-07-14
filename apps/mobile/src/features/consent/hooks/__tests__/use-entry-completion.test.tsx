import { act, renderHook } from '@testing-library/react-native'
import { makeError, ok } from '@eltizamati/domain'
import { useEntryCompletion } from '../use-entry-completion'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

const mockReadLocalConsent = jest.fn()
jest.mock('../../consent-policy', () => ({
  readLocalConsent: () => mockReadLocalConsent(),
  isCurrentLocalConsent: () => true,
  ensurePersonalConsent: jest.fn(),
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

jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthServiceLazy: () => jest.fn(),
  useConsentRepositoryLazy: () => jest.fn(),
}))
jest.mock('@/features/auth/services/auth-boundary-events', () => ({
  notifyAuthBoundaryChanged: jest.fn(),
}))
jest.mock('@/services/local-notification-service', () => ({
  enableNotificationNavigation: jest.fn(),
}))

describe('useEntryCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReadLocalConsent.mockResolvedValue(ok({ version: 'v1' }))
    mockSetDataMode.mockResolvedValue(undefined)
    mockSetOnboardingComplete.mockResolvedValue(undefined)
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
})
