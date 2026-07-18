import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ScheduleList } from '../ScheduleList'
import { Text } from '@/core/design-system'
import type { AmortizationScheduleRow } from '../../hooks/use-amortization-schedule-view-model'

const entries: AmortizationScheduleRow[] = [
  {
    period: 1,
    date: '2026-01-01',
    payment: '250',
    principal: '200',
    cost: '50',
    closingBalance: '9800',
    costPercentChangeFromPrevious: undefined,
  },
  {
    period: 2,
    date: '2026-02-01',
    payment: '250',
    principal: '205',
    cost: '45',
    closingBalance: '9595',
    costPercentChangeFromPrevious: -10,
  },
]

function renderAmount(value: string) {
  return <>{value} JOD</>
}

describe('ScheduleList', () => {
  it('renders one row per schedule period, not a mini-form per period', () => {
    const { getByText } = render(<ScheduleList schedule={entries} renderAmount={renderAmount} />)
    expect(getByText('schedule.period 1')).toBeTruthy()
    expect(getByText('schedule.period 2')).toBeTruthy()
  })

  it('does not show the full breakdown until a row is tapped', () => {
    const { queryByText } = render(<ScheduleList schedule={entries} renderAmount={renderAmount} />)
    expect(queryByText('schedule.principalPortion')).toBeNull()
  })

  it('opens the full breakdown sheet when a row is tapped', () => {
    const { getByLabelText, getByText } = render(
      <ScheduleList schedule={entries} renderAmount={renderAmount} />,
    )
    fireEvent.press(getByLabelText('schedule.period 1'))
    expect(getByText('schedule.principalPortion')).toBeTruthy()
    expect(getByText('schedule.interestPortion')).toBeTruthy()
    expect(getByText('schedule.endingBalance')).toBeTruthy()
  })

  it('shows the cost-change badge for periods after the first', () => {
    const { getByText } = render(<ScheduleList schedule={entries} renderAmount={renderAmount} />)
    expect(getByText('-10.0%')).toBeTruthy()
  })

  it('renders an optional proposal summary as the list header', () => {
    const { getByText } = render(
      <ScheduleList
        schedule={entries}
        renderAmount={renderAmount}
        header={<Text>Private schedule proposal</Text>}
      />,
    )
    expect(getByText('Private schedule proposal')).toBeTruthy()
  })

  it('marks a generated final-month balloon and shows its amount in the breakdown', () => {
    const first = entries[0]
    const second = entries[1]
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    if (first === undefined || second === undefined) return
    const withBalloon: AmortizationScheduleRow[] = [
      first,
      {
        ...second,
        finalBalloonAmount: '1356',
        finalBalloonKind: 'projected',
      },
    ]
    const { getByText, getByLabelText } = render(
      <ScheduleList schedule={withBalloon} renderAmount={renderAmount} />,
    )
    expect(getByText('schedule.projectedBalloonBadge')).toBeTruthy()
    fireEvent.press(getByLabelText('schedule.period 2'))
    expect(getByText('schedule.projectedFinalBalloon')).toBeTruthy()
  })
})
