/**
 * Mounted AppProviders test for the repository commit acknowledgement (F: repo
 * boot must wait for provider commit). It uses the real AppProviders, the real
 * QueryClient, the real repository provider lifecycle, and the real demo boot —
 * only expo-router navigation is a controlled double. It proves that once a
 * demo boot resolves, a repository-dependent screen renders through the real
 * RequireRepositories gate without a transient sign-in redirect.
 */
import React, { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { AppProviders, useDemoBoot } from '../providers'
import { RequireRepositories } from '../features/repositories/components/RequireRepositories'
import { useRepositories } from '../features/repositories/hooks/use-repositories'

const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
  useSegments: () => [],
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual('react-native')
    return <RNText>{`REDIRECT ${href}`}</RNText>
  },
}))

function ProtectedScreen() {
  const repos = useRepositories()
  return <Text>protected:{repos.obligationRepository ? 'ready' : 'missing'}</Text>
}

function Harness() {
  const boot = useDemoBoot()
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    let active = true
    void boot().then(() => {
      // Navigate to the gated screen only after boot resolves, exactly as
      // entry completion does. If boot resolved before the provider committed,
      // RequireRepositories would observe null repos and redirect here.
      if (active) setEntered(true)
    })
    return () => {
      active = false
    }
  }, [boot])
  if (!entered) return <Text>booting</Text>
  return (
    <RequireRepositories>
      <ProtectedScreen />
    </RequireRepositories>
  )
}

describe('AppProviders repository commit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reaches a repository-dependent screen after boot with no transient sign-in redirect', async () => {
    const { getByText, queryByText } = render(
      <AppProviders>
        <Harness />
      </AppProviders>,
    )

    await waitFor(() => expect(getByText('protected:ready')).toBeTruthy())
    expect(queryByText('REDIRECT /auth/sign-in')).toBeNull()
    expect(mockReplace).not.toHaveBeenCalledWith('/auth/sign-in')
  })
})
