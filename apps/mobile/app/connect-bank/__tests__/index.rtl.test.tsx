import React from 'react'
import { render } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { brandId, ok } from '@eltizamati/domain'
import ConnectBankPickerScreen from '../index'
import * as repositoriesModule from '@/features/repositories/hooks/use-repositories'
import * as activeUserModule from '@/features/auth/hooks/use-active-user'
import { __resetConnectBankFlowForTest } from '@/features/connect-bank/connect-bank-flow-store'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), canGoBack: () => false }),
}))

jest.mock('@react-navigation/native', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}))

// Overrides the project-wide react-i18next mock (jest-setup.js) for this
// file only, to exercise the Arabic/RTL branch of the bank picker's label
// selection (`i18n.language.startsWith('ar')`).
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}))

describe('ConnectBankPickerScreen (RTL)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetConnectBankFlowForTest()
  })

  it('renders Arabic bank names when the active language is Arabic', async () => {
    jest.spyOn(repositoriesModule, 'useRepositories').mockReturnValue({
      consentRepository: {
        status: jest.fn().mockResolvedValue(
          ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]),
        ),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    jest.spyOn(activeUserModule, 'useActiveUser').mockReturnValue(brandId('mock-user'))

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { findByText } = render(
      <QueryClientProvider client={client}>
        <ConnectBankPickerScreen />
      </QueryClientProvider>,
    )

    expect(await findByText('البنك العربي')).toBeTruthy()
  })
})
