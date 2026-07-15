import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { brandId, ok, type UserProfileRepository } from '@eltizamati/domain'
import { useProfileQuery } from '../use-profile'

const profile = {
  userId: brandId<'user'>('a0000000-0000-4000-8000-000000000001'),
  locale: 'en' as const,
  dataMode: 'personal' as const,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
}

describe('useProfileQuery', () => {
  it('does not issue a profile read until an authenticated user id exists', async () => {
    const repository = {
      get: jest.fn().mockResolvedValue(ok(profile)),
      save: jest.fn(),
      createIfAbsent: jest.fn(),
    } as jest.Mocked<UserProfileRepository>
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    let userId: typeof profile.userId | null = null
    const hook = renderHook(() => useProfileQuery(repository, userId), { wrapper })

    expect(repository.get).not.toHaveBeenCalled()
    userId = profile.userId
    hook.rerender(undefined)
    await waitFor(() => expect(repository.get).toHaveBeenCalledWith(profile.userId))
    hook.unmount()
    client.clear()
  })
})
