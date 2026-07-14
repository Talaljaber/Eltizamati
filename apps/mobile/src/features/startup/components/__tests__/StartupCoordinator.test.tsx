import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { makeError, ok } from '@eltizamati/domain'
import { StartupCoordinator } from '../StartupCoordinator'
import { __resetSplashReleaseForTest } from '../../services/splash-release'

let mockI18nInitialization: Promise<void> = Promise.resolve()
jest.mock('@/i18n', () => ({
  get i18nInitialization() {
    return mockI18nInitialization
  },
}))

const mockHideAsync = jest.fn()
jest.mock('expo-splash-screen', () => ({ hideAsync: () => mockHideAsync() }))
jest.mock('@/core/config/runtime-environment', () => ({ isExpoGo: false }))

const mockReplace = jest.fn()
let mockSegments: string[] = ['(tabs)']
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useSegments: () => mockSegments,
}))

const mockUseTranslation = jest.fn()
jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation(),
}))

const defaultTranslation = {
  t: (key: string) => key,
  i18n: {
    isInitialized: true,
    on: jest.fn(),
    off: jest.fn(),
    language: 'en',
    dir: () => 'ltr',
  },
}

const mockReadStartupTrustState = jest.fn()
jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  readStartupTrustState: () => mockReadStartupTrustState(),
}))

const localConsent = {
  docType: 'privacy-policy',
  version: 'v1',
  locale: 'en',
  acknowledgedAt: '2026-07-14T00:00:00.000Z',
}
const mockReadLocalConsent = jest.fn()
const mockEnsurePersonalConsent = jest.fn()
jest.mock('@/features/consent/consent-policy', () => ({
  readLocalConsent: () => mockReadLocalConsent(),
  isCurrentLocalConsent: (value: unknown) =>
    (value as { version?: string } | undefined)?.version === 'v1',
  ensurePersonalConsent: (...args: unknown[]) => mockEnsurePersonalConsent(...args),
}))

const mockCurrentSession = jest.fn()
const mockGetAuthService = jest.fn()
const mockGetConsentRepository = jest.fn()
jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthServiceLazy: () => mockGetAuthService,
  useConsentRepositoryLazy: () => mockGetConsentRepository,
}))

const mockBootDemo = jest.fn()
const mockBootPersonal = jest.fn()
jest.mock('@/providers', () => ({
  useDemoBoot: () => mockBootDemo,
  usePersonalBoot: () => mockBootPersonal,
}))

describe('StartupCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetSplashReleaseForTest()
    mockSegments = ['(tabs)']
    mockReadLocalConsent.mockResolvedValue(ok(localConsent))
    mockReadStartupTrustState.mockResolvedValue(ok({ dataMode: 'demo', onboardingComplete: true }))
    mockBootDemo.mockResolvedValue(undefined)
    mockBootPersonal.mockResolvedValue(undefined)
    mockCurrentSession.mockResolvedValue(
      ok({ user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined }),
    )
    mockGetAuthService.mockReturnValue(ok({ currentSession: mockCurrentSession }))
    mockGetConsentRepository.mockReturnValue(ok({ status: jest.fn(), acknowledge: jest.fn() }))
    mockEnsurePersonalConsent.mockResolvedValue(ok(undefined))
    mockI18nInitialization = Promise.resolve()
    mockHideAsync.mockResolvedValue(undefined)
    mockUseTranslation.mockReturnValue(defaultTranslation)
  })

  it('routes a fresh install through language, rendering the Stack and releasing the splash', async () => {
    mockReadStartupTrustState.mockResolvedValue(ok({ dataMode: null, onboardingComplete: false }))
    mockReadLocalConsent.mockResolvedValue(ok(undefined))
    const { getByText } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    // The redirect must settle: the router Stack (children) actually renders
    // — not a spinner stuck forever — and the native splash is released.
    await waitFor(() => expect(getByText('product')).toBeTruthy())
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/language')
    expect(mockHideAsync).toHaveBeenCalledTimes(1)
    expect(mockBootDemo).not.toHaveBeenCalled()
    expect(mockGetAuthService).not.toHaveBeenCalled()
  })

  it('boots returning demo mode without constructing Supabase', async () => {
    const { getByText } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByText('product')).toBeTruthy())
    expect(mockBootDemo).toHaveBeenCalledTimes(1)
    expect(mockGetAuthService).not.toHaveBeenCalled()
  })

  it('redirects an expired personal session to sign-in, rendering the Stack and releasing the splash', async () => {
    mockReadStartupTrustState.mockResolvedValue(
      ok({ dataMode: 'personal', onboardingComplete: true }),
    )
    mockCurrentSession.mockResolvedValue(ok(undefined))
    const { getByText } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByText('product')).toBeTruthy())
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
    expect(mockHideAsync).toHaveBeenCalledTimes(1)
    expect(mockBootPersonal).not.toHaveBeenCalled()
  })

  it('redirects to consent when onboarding mode is reached without current consent', async () => {
    mockSegments = ['onboarding', 'mode']
    mockReadStartupTrustState.mockResolvedValue(ok({ dataMode: null, onboardingComplete: false }))
    mockReadLocalConsent.mockResolvedValue(ok(undefined))
    const { getByText } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByText('product')).toBeTruthy())
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/consent')
    expect(mockHideAsync).toHaveBeenCalledTimes(1)
  })

  it('checks server consent before booting returning personal mode', async () => {
    mockReadStartupTrustState.mockResolvedValue(
      ok({ dataMode: 'personal', onboardingComplete: true }),
    )
    const { getByText } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByText('product')).toBeTruthy())
    expect(mockEnsurePersonalConsent).toHaveBeenCalled()
    expect(mockBootPersonal).toHaveBeenCalledTimes(1)
  })

  it('surfaces storage failure with a retry action instead of spinning forever', async () => {
    mockReadStartupTrustState.mockResolvedValue({ ok: false, error: makeError('storage') })
    const { getByTestId } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByTestId('startup-error')).toBeTruthy())
  })

  it('does not perform late boot work after unmount', async () => {
    let resolveTrust: ((value: unknown) => void) | undefined
    mockReadStartupTrustState.mockReturnValue(
      new Promise((resolve) => {
        resolveTrust = resolve
      }),
    )
    const view = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )
    view.unmount()
    resolveTrust?.(ok({ dataMode: 'demo', onboardingComplete: true }))
    await Promise.resolve()

    expect(mockBootDemo).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('surfaces a rejected i18n initialization instead of waiting forever', async () => {
    mockI18nInitialization = Promise.reject(makeError('unexpected'))
    mockUseTranslation.mockReturnValueOnce({
      t: (key: string) => key,
      i18n: { isInitialized: false, language: 'en', dir: () => 'ltr' },
    })
    const { getByTestId } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByTestId('startup-error')).toBeTruthy())
  })

  it('keeps splash retryable when the first hide fails', async () => {
    mockHideAsync.mockRejectedValueOnce(makeError('unexpected')).mockResolvedValueOnce(undefined)
    const { getByTestId, getByText } = render(
      <StartupCoordinator>
        <Text>product</Text>
      </StartupCoordinator>,
    )

    await waitFor(() => expect(getByTestId('startup-error')).toBeTruthy())
    expect(mockHideAsync).toHaveBeenCalledTimes(1)
    fireEvent.press(getByText('common.retry'))
    await waitFor(() => expect(mockHideAsync).toHaveBeenCalledTimes(2))
  })
})
