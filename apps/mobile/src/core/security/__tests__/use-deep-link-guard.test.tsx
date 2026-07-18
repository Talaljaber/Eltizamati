import React from 'react'
import { render } from '@testing-library/react-native'
import { useDeepLinkGuard } from '../use-deep-link-guard'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}))

let mockUrl: string | null = null
let mockParsedPath = ''
jest.mock('expo-linking', () => ({
  useURL: () => mockUrl,
  parse: () => ({ path: mockParsedPath, queryParams: {} }),
}))

function Harness() {
  useDeepLinkGuard()
  return null
}

describe('useDeepLinkGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockUrl = null
    mockParsedPath = ''
  })

  it('does nothing when there is no incoming URL', () => {
    render(<Harness />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect for an allow-listed path', () => {
    mockUrl = 'eltizamati://obligation/obl-123'
    mockParsedPath = 'obligation/obl-123'
    render(<Harness />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects to the tab root for a disallowed path', () => {
    mockUrl = 'eltizamati://settings/danger-zone'
    mockParsedPath = 'settings/danger-zone'
    render(<Harness />)
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
  })
})
