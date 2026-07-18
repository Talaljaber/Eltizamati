/**
 * AppSidebar tests — the wide-web custom `tabBar` renderer. Verifies the
 * primary nav renders every route as a tab with correct active state and
 * fires `navigation.navigate` on press; secondary rows navigate via router.
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { AppSidebar } from '../AppSidebar'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

function makeProps(activeIndex: number) {
  const routes = [
    { key: 'index-key', name: 'index' },
    { key: 'obligations-key', name: 'obligations' },
  ]
  const descriptors = {
    'index-key': {
      options: {
        title: 'Home',
        tabBarIcon: ({ color }: { color: string }) => (
          <Ionicons name="home-outline" size={20} color={color} />
        ),
      },
    },
    'obligations-key': {
      options: {
        title: 'Obligations',
        tabBarIcon: ({ color }: { color: string }) => (
          <Ionicons name="list-outline" size={20} color={color} />
        ),
      },
    },
  }
  const navigate = jest.fn()

  const props = {
    state: { routes, index: activeIndex },
    descriptors,
    navigation: { navigate },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps

  return { props, navigate }
}

describe('AppSidebar', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders a tab for every route', () => {
    const { props } = makeProps(0)
    const { getByTestId } = render(<AppSidebar {...props} />)
    expect(getByTestId('app-sidebar-index')).toBeTruthy()
    expect(getByTestId('app-sidebar-obligations')).toBeTruthy()
  })

  it('marks the active route as selected', () => {
    const { props } = makeProps(1)
    const { getByTestId } = render(<AppSidebar {...props} />)
    expect(getByTestId('app-sidebar-obligations').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('app-sidebar-index').props.accessibilityState.selected).toBe(false)
  })

  it('navigates when an inactive tab is pressed', () => {
    const { props, navigate } = makeProps(0)
    const { getByTestId } = render(<AppSidebar {...props} />)
    fireEvent.press(getByTestId('app-sidebar-obligations'))
    expect(navigate).toHaveBeenCalledWith('obligations')
  })

  it('does not re-navigate when the active tab is pressed', () => {
    const { props, navigate } = makeProps(0)
    const { getByTestId } = render(<AppSidebar {...props} />)
    fireEvent.press(getByTestId('app-sidebar-index'))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('routes to settings and profile via the router on the secondary rows', () => {
    const { props } = makeProps(0)
    const { getByLabelText } = render(<AppSidebar {...props} />)
    fireEvent.press(getByLabelText('navigation.settings'))
    expect(mockPush).toHaveBeenCalledWith('/settings/')
    fireEvent.press(getByLabelText('profile.title'))
    expect(mockPush).toHaveBeenCalledWith('/profile')
  })
})
