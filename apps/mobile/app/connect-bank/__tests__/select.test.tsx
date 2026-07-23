import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { brandId, err, makeError, ok, toLocalDate } from '@eltizamati/domain'
import ConnectBankSelectScreen from '../select'
import * as repositoriesModule from '@/features/repositories/hooks/use-repositories'
import * as activeUserModule from '@/features/auth/hooks/use-active-user'
import {
  __resetConnectBankFlowForTest,
  markSignedIn,
  selectBank,
} from '@/features/connect-bank/connect-bank-flow-store'
import { MockConnectService, externalRecordObligationId } from '@/services/mock-connect-service'
import { ImportService } from '@/services/import-service'

const mockReplace = jest.fn()
const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}))

const userId = brandId<'user'>('mock-user')
const card = {
  productType: 'creditCard' as const,
  externalId: 'arab-bank-card-v1',
  institutionName: 'Arab Bank',
  currency: 'JOD' as const,
  openedDate: toLocalDate('2024-01-01'),
  creditLimit: '2500',
  currentBalance: '640',
  purchaseAprPercent: '22',
  minimumPaymentPercent: '3',
  minimumPaymentFloor: '15',
}

const listExisting = jest.fn()
const markBankConnectComplete = jest.fn()

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  })
  jest.spyOn(repositoriesModule, 'useRepositories').mockReturnValue({
    obligationRepository: { list: listExisting },
    userProfileRepository: { markBankConnectComplete },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  jest.spyOn(activeUserModule, 'useActiveUser').mockReturnValue(userId)
  return render(
    <QueryClientProvider client={client}>
      <ConnectBankSelectScreen />
    </QueryClientProvider>,
  )
}

describe('ConnectBankSelectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetConnectBankFlowForTest()
    listExisting.mockResolvedValue(ok([]))
    markBankConnectComplete.mockResolvedValue(ok({}))
  })

  it('redirects to the bank picker when the flow has no signed-in bank', () => {
    renderScreen()
    expect(mockReplace).toHaveBeenCalledWith('/connect-bank')
  })

  it('shows a retryable error state when retrieval fails, and retry re-attempts it', async () => {
    selectBank('arab-bank')
    markSignedIn()
    jest
      .spyOn(MockConnectService.prototype, 'retrieve')
      .mockResolvedValueOnce(err(makeError('storage')))
      .mockResolvedValueOnce(ok([card]))
    const { findByTestId, getByText } = renderScreen()
    await findByTestId('connect-bank-retrieve-error')

    fireEvent.press(getByText('common.retry'))
    await waitFor(() => expect(MockConnectService.prototype.retrieve).toHaveBeenCalledTimes(2))
  })

  it('shows an honest empty state when the bank returns zero obligations', async () => {
    selectBank('blink')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([]))
    const { findByTestId } = renderScreen()
    await findByTestId('connect-bank-empty')
  })

  it('empty state: Continue completes onboarding and enters the app (no loop back to the picker)', async () => {
    selectBank('blink')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([]))
    const { findByTestId, getByText } = renderScreen()
    await findByTestId('connect-bank-empty')

    fireEvent.press(getByText('common.continue'))

    await waitFor(() => expect(markBankConnectComplete).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/'))
    expect(mockReplace).not.toHaveBeenCalledWith('/connect-bank')
  })

  it('empty state: "choose a different bank" stays available and returns to the picker', async () => {
    selectBank('blink')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([]))
    const { findByTestId } = renderScreen()

    fireEvent.press(await findByTestId('connect-bank-empty-pick-another'))

    expect(mockReplace).toHaveBeenCalledWith('/connect-bank')
    expect(markBankConnectComplete).not.toHaveBeenCalled()
  })

  it('filters out records already imported from this bank, and shows a distinct "already up to date" state when everything was', async () => {
    selectBank('arab-bank')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([card]))
    listExisting.mockResolvedValue(
      ok([
        { id: externalRecordObligationId('arab-bank', card.externalId, userId) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any),
    )
    const { findByTestId, queryByTestId } = renderScreen()
    await findByTestId('connect-bank-already-imported')
    expect(queryByTestId(`connect-bank-select-${card.externalId}`)).toBeNull()
  })

  it('a fully successful import navigates straight to done', async () => {
    selectBank('arab-bank')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([card]))
    jest.spyOn(ImportService.prototype, 'importProviderObligations').mockResolvedValue({
      imported: [brandId('obligation-1')],
      skipped: [],
      failed: [],
    })
    const { findByTestId } = renderScreen()
    const checkbox = await findByTestId(`connect-bank-select-${card.externalId}`)
    fireEvent.press(checkbox)
    fireEvent.press(await findByTestId('connect-bank-import-selected'))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/connect-bank/done'))
  })

  it('a partial import failure shows the error and a "continue anyway" that still proceeds', async () => {
    selectBank('arab-bank')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([card]))
    jest.spyOn(ImportService.prototype, 'importProviderObligations').mockResolvedValue({
      imported: [],
      skipped: [],
      failed: [{ id: brandId('obligation-1'), error: makeError('storage') }],
    })
    const { findByTestId } = renderScreen()
    const checkbox = await findByTestId(`connect-bank-select-${card.externalId}`)
    fireEvent.press(checkbox)
    fireEvent.press(await findByTestId('connect-bank-import-selected'))
    await findByTestId('connect-bank-continue-anyway')
    expect(mockPush).not.toHaveBeenCalledWith('/connect-bank/done')

    fireEvent.press(await findByTestId('connect-bank-continue-anyway'))
    expect(mockPush).toHaveBeenCalledWith('/connect-bank/done')
  })

  it('an import that throws shows an inline error instead of a silent failure', async () => {
    selectBank('arab-bank')
    markSignedIn()
    jest.spyOn(MockConnectService.prototype, 'retrieve').mockResolvedValue(ok([card]))
    jest
      .spyOn(ImportService.prototype, 'importProviderObligations')
      .mockRejectedValue(makeError('unexpected'))
    const { findByTestId } = renderScreen()
    const checkbox = await findByTestId(`connect-bank-select-${card.externalId}`)
    fireEvent.press(checkbox)
    fireEvent.press(await findByTestId('connect-bank-import-selected'))
    await findByTestId('connect-bank-import-error')
    expect(mockPush).not.toHaveBeenCalledWith('/connect-bank/done')
  })
})
