/**
 * RequireRepositories — structural gate regression test.
 *
 * Covers the fix for the OnboardingGuard crash: repository-dependent routes
 * must not mount their body (which calls the throwing useRepositories) when
 * no RepositoriesProvider is mounted — they should redirect instead.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { RequireRepositories } from '../RequireRepositories'
import { RepositoriesProvider } from '@/features/repositories/hooks/use-repositories'
import { createDemoRepositories } from '@/services/repositories/demo'

const mockRedirect = jest.fn((_props: { href: string }) => null)
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props)
    return null
  },
}))

describe('RequireRepositories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when wrapped in RepositoriesProvider', () => {
    const repositories = createDemoRepositories()
    const { getByText } = render(
      <RepositoriesProvider repositories={repositories}>
        <RequireRepositories>
          <Text>protected content</Text>
        </RequireRepositories>
      </RepositoriesProvider>,
    )

    expect(getByText('protected content')).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('renders the redirect (not children) when no provider is present', () => {
    const { queryByText } = render(
      <RequireRepositories>
        <Text>protected content</Text>
      </RequireRepositories>,
    )

    expect(queryByText('protected content')).toBeNull()
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/onboarding/language' })
  })
})
