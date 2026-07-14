import React from 'react'
import { I18nManager } from 'react-native'
import { render, within } from '@testing-library/react-native'
import { NavRow, ObligationManageActions, deriveDetailObligationStatus } from '../../[id]'
import { aCard } from '@eltizamati/demo-data'
import { toLocalDate } from '@eltizamati/domain'

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text testID={`icon-${name}`}>{name}</Text>
  },
}))

describe('Workstream 4 obligation-detail patterns', () => {
  it('renders a back-pointing navigation chevron in RTL', () => {
    const original = I18nManager.isRTL
    Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true })
    try {
      const { getByTestId } = render(
        <NavRow icon="time-outline" label="سجل المعدل" onPress={jest.fn()} />,
      )
      expect(getByTestId('icon-chevron-back-outline')).toBeTruthy()
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { value: original, configurable: true })
    }
  })

  it('keeps destructive management actions in a separate group from ordinary actions', () => {
    const { getByTestId } = render(
      <ObligationManageActions
        archiving={false}
        deleting={false}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    const manage = within(getByTestId('obligation-manage-actions'))
    expect(manage.getByText('obligationDetail.archive')).toBeTruthy()
    expect(manage.getByText('obligationDetail.delete')).toBeTruthy()
    expect(manage.queryByText('obligationDetail.edit')).toBeNull()
    expect(manage.queryByText('obligationDetail.logPayment')).toBeNull()
  })

  it('derives personal detail status from the shared explicit as-of date', () => {
    const demoCard = aCard()
    const personalCard = {
      ...demoCard,
      provenance: {
        source: 'userEntered' as const,
        observedAt: '2026-07-01T00:00:00.000Z',
        recordedAt: '2026-07-01T00:00:00.000Z',
      },
    }

    expect(deriveDetailObligationStatus(personalCard, [], [], toLocalDate('2026-07-16'))).toBe(
      'onTrack',
    )
    expect(deriveDetailObligationStatus(personalCard, [], [], toLocalDate('2026-07-17'))).toBe(
      'overdue',
    )
  })
})
