/**
 * RequireDemoRepositories — structural gate regression test.
 *
 * Covers the fix for the OnboardingGuard crash: demo-only routes must not
 * mount their body (which calls the throwing useDemoRepositories) when no
 * DemoRepositoriesProvider is mounted — they should redirect instead.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { RequireDemoRepositories } from '../RequireDemoRepositories'
import { DemoRepositoriesProvider } from '@/features/demo/hooks/use-demo-repositories'
import { createDemoRepositories } from '@/services/repositories/demo'

const mockRedirect = jest.fn((_props: { href: string }) => null)
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props)
    return null
  },
}))

describe('RequireDemoRepositories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when wrapped in DemoRepositoriesProvider', () => {
    const repositories = createDemoRepositories()
    const { getByText } = render(
      <DemoRepositoriesProvider repositories={repositories}>
        <RequireDemoRepositories>
          <Text>protected content</Text>
        </RequireDemoRepositories>
      </DemoRepositoriesProvider>,
    )

    expect(getByText('protected content')).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('renders the redirect (not children) when no provider is present', () => {
    const { queryByText } = render(
      <RequireDemoRepositories>
        <Text>protected content</Text>
      </RequireDemoRepositories>,
    )

    expect(queryByText('protected content')).toBeNull()
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/onboarding/language' })
  })
})
