import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { brandId, ok } from '@eltizamati/domain'
import MockConsentScreen from '../consent'
import * as repositoriesModule from '@/features/repositories/hooks/use-repositories'
import * as activeUserModule from '@/features/auth/hooks/use-active-user'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}))

describe('MockConsentScreen', () => {
  it('records consent with a Postgres-valid UUID even when randomUUID is unavailable', async () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    const acknowledge = jest.fn().mockResolvedValue(ok(undefined))
    jest.spyOn(repositoriesModule, 'useRepositories').mockReturnValue({
      consentRepository: { acknowledge },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    jest.spyOn(activeUserModule, 'useActiveUser').mockReturnValue(brandId<'user'>('mock-user'))

    try {
      const { getByText } = render(<MockConsentScreen />)
      fireEvent.press(getByText('mockConnect.consentAction'))
      await waitFor(() => expect(acknowledge).toHaveBeenCalledTimes(1))
      expect(acknowledge.mock.calls[0][0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
      expect(mockReplace).toHaveBeenCalledWith('/connect-mock')
    } finally {
      if (cryptoDescriptor === undefined) delete (globalThis as { crypto?: unknown }).crypto
      else Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
    }
  })
})
