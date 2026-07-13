import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { brandId, ok } from '@eltizamati/domain'
import MockConnectScreen from '../index'
import { MockConnectService } from '@/services/mock-connect-service'
import * as repositoriesModule from '@/features/repositories/hooks/use-repositories'
import * as activeUserModule from '@/features/auth/hooks/use-active-user'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace }),
}))

describe('MockConnectScreen', () => {
  it('keeps the provider visibly mock-labeled and imports after versioned consent', async () => {
    const userId = brandId<'user'>('mock-user')
    jest.spyOn(repositoriesModule, 'useRepositories').mockReturnValue({
      consentRepository: {
        status: jest.fn().mockResolvedValue(
          ok([
            {
              docType: 'provider:mock-open-banking',
              version: 'v1',
            },
          ]),
        ),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    jest.spyOn(activeUserModule, 'useActiveUser').mockReturnValue(userId)
    jest.spyOn(MockConnectService.prototype, 'retrieveAndImport').mockResolvedValue(
      ok({
        obligationId: brandId<'obligation'>('mock-card-mock-user'),
        importedCount: 1,
      }),
    )

    const { getByText, findByText } = render(<MockConnectScreen />)
    expect(getByText('mockConnect.mockBadge')).toBeTruthy()
    fireEvent.press(getByText('mockConnect.connect'))
    await findByText('mockConnect.success')
    await waitFor(() =>
      expect(MockConnectService.prototype.retrieveAndImport).toHaveBeenCalledWith(
        userId,
        expect.any(Object),
      ),
    )
  })
})
