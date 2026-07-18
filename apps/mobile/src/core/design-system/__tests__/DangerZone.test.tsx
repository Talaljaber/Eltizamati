import React from 'react'
import { render, fireEvent, within } from '@testing-library/react-native'
import { DangerZone } from '../primitives/DangerZone'

describe('DangerZone', () => {
  it('renders the title and every action label', () => {
    const { getByText } = render(
      <DangerZone
        title="Manage"
        actions={[
          { label: 'Archive', onPress: jest.fn() },
          { label: 'Delete', variant: 'destructive', onPress: jest.fn() },
        ]}
      />,
    )
    expect(getByText('Manage')).toBeTruthy()
    expect(getByText('Archive')).toBeTruthy()
    expect(getByText('Delete')).toBeTruthy()
  })

  it('fires onPress immediately when an action has no confirm step', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <DangerZone title="Manage" actions={[{ label: 'Archive', onPress }]} />,
    )
    fireEvent.press(getByText('Archive'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('opens a confirmation sheet instead of firing onPress directly when confirm is set', () => {
    const onPress = jest.fn()
    const { getByText, queryByText } = render(
      <DangerZone
        title="Manage"
        actions={[
          {
            label: 'Delete',
            variant: 'destructive',
            onPress,
            confirm: {
              title: 'Delete this obligation?',
              body: 'This cannot be undone.',
              confirmLabel: 'Yes, delete',
            },
          },
        ]}
      />,
    )
    fireEvent.press(getByText('Delete'))
    expect(onPress).not.toHaveBeenCalled()
    expect(queryByText('This cannot be undone.')).toBeTruthy()

    fireEvent.press(getByText('Yes, delete'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('cancel dismisses the sheet without firing onPress', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <DangerZone
        title="Manage"
        actions={[
          {
            label: 'Delete',
            onPress,
            confirm: {
              title: 'Sure?',
              body: 'Cannot be undone.',
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel',
            },
          },
        ]}
      />,
    )
    fireEvent.press(getByText('Delete'))
    fireEvent.press(getByText('Cancel'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('scopes actions under the provided testID', () => {
    const { getByTestId } = render(
      <DangerZone
        testID="manage-actions"
        title="Manage"
        actions={[{ label: 'Archive', onPress: jest.fn() }]}
      />,
    )
    const scoped = within(getByTestId('manage-actions'))
    expect(scoped.getByText('Archive')).toBeTruthy()
  })
})
