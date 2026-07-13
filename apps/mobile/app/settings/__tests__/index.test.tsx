/**
 * SettingsScreen — reset-demo-data control (FR-SET-005). Verifies the
 * button only appears when the active repositories are the demo family
 * (i.e. `reset` exists), and that confirming the alert actually calls
 * `ImportService.resetDemo` and invalidates the query cache.
 */
import React from 'react'
import { Alert } from 'react-native'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ok } from '@eltizamati/domain'
import SettingsScreen from '../index'
import { ImportService } from '@/services/import-service'
import * as useReposModule from '@/features/repositories/hooks/use-repositories'
import * as useAuthServiceModule from '@/features/auth/hooks/use-auth-service'

jest.mock('@/i18n', () => ({
  changeLanguage: jest.fn().mockResolvedValue(undefined),
}))

function renderScreen(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <SettingsScreen />
    </QueryClientProvider>,
  )
}

describe('SettingsScreen', () => {
  let client: QueryClient

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    jest.clearAllMocks()
  })

  it('does not show a reset control when repositories have no reset() (personal mode)', () => {
    jest.spyOn(useReposModule, 'useRepositoriesIfAvailable').mockReturnValue({
      obligationRepository: {},
      paymentRepository: {},
      ratePeriodRepository: {},
      calculationRunRepository: {},
      insightRepository: {},
      consentRepository: {},
      userProfileRepository: {},
      authService: undefined,
      queryClient: client,
      // no `reset` key at all — matches personal-mode RepositoryRegistry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const { queryByTestId } = renderScreen(client)
    expect(queryByTestId('settings-reset-demo')).toBeNull()
  })

  it('resets demo data and invalidates the query cache when confirmed', async () => {
    const reset = jest.fn()
    jest.spyOn(useReposModule, 'useRepositoriesIfAvailable').mockReturnValue({
      obligationRepository: {},
      paymentRepository: {},
      ratePeriodRepository: {},
      calculationRunRepository: {},
      insightRepository: {},
      consentRepository: {},
      userProfileRepository: {},
      reset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const resetDemoSpy = jest.spyOn(ImportService.prototype, 'resetDemo').mockResolvedValue({
      ok: true,
      value: { obligationCount: 3, paymentCount: 0, insightCount: 0 },
    })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByTestId } = renderScreen(client)
    expect(getByTestId('settings-reset-demo')).toBeTruthy()

    fireEvent.press(getByTestId('settings-reset-demo'))

    await waitFor(() => expect(resetDemoSpy).toHaveBeenCalledTimes(1))
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })

  it('shows the account section with sign-out/delete-account controls in personal mode', async () => {
    jest.spyOn(useReposModule, 'useRepositoriesIfAvailable').mockReturnValue({
      obligationRepository: {},
      paymentRepository: {},
      ratePeriodRepository: {},
      calculationRunRepository: {},
      insightRepository: {},
      consentRepository: {},
      userProfileRepository: {},
      // no `reset` key — personal mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const signOut = jest.fn().mockResolvedValue(ok(undefined))
    const deleteAccount = jest.fn().mockResolvedValue(ok(undefined))
    const currentSession = jest
      .fn()
      .mockResolvedValue(
        ok({ user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined }),
      )
    jest.spyOn(useAuthServiceModule, 'useAuthServiceIfAvailable').mockReturnValue(
      ok({
        signOut,
        deleteAccount,
        currentSession,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )

    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByTestId, findByText } = renderScreen(client)
    await findByText('settings.signedInAs')

    fireEvent.press(getByTestId('settings-sign-out'))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))

    fireEvent.press(getByTestId('settings-delete-account'))
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1))
  })
})
