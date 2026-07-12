/**
 * ErrorState primitive tests — renders the right honest surface for each
 * ErrorUiState kind (core/errors/error-ui-state.ts), with/without retry.
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ErrorState } from '../primitives/ErrorState'

describe('ErrorState', () => {
  it('renders the offline title/body for kind="offline"', () => {
    const { getByText } = render(<ErrorState state={{ kind: 'offline' }} />)
    expect(getByText('error.offlineTitle')).toBeTruthy()
    expect(getByText('error.offlineBody')).toBeTruthy()
  })

  it('shows a retry CTA for offline only when onRetry is provided', () => {
    const onRetry = jest.fn()
    const { getByText } = render(<ErrorState state={{ kind: 'offline' }} onRetry={onRetry} />)
    fireEvent.press(getByText('common.retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits the retry CTA for offline when onRetry is not provided', () => {
    const { queryByText } = render(<ErrorState state={{ kind: 'offline' }} />)
    expect(queryByText('common.retry')).toBeNull()
  })

  it('renders the auth-required title/body for kind="authRequired"', () => {
    const { getByText } = render(<ErrorState state={{ kind: 'authRequired' }} />)
    expect(getByText('error.authRequiredTitle')).toBeTruthy()
    expect(getByText('error.authRequiredBody')).toBeTruthy()
  })

  it('offers "continue in demo mode" for authRequired when provided', () => {
    const onContinue = jest.fn()
    const { getByText } = render(
      <ErrorState state={{ kind: 'authRequired' }} onContinueInDemoMode={onContinue} />,
    )
    fireEvent.press(getByText('onboarding.modeDemo'))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('renders the userMessageKey and a retry CTA for kind="retryable"', () => {
    const onRetry = jest.fn()
    const { getByText } = render(
      <ErrorState
        state={{ kind: 'retryable', userMessageKey: 'error.storage' }}
        onRetry={onRetry}
      />,
    )
    expect(getByText('error.storage')).toBeTruthy()
    fireEvent.press(getByText('common.retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders the userMessageKey with no retry CTA for kind="fatal"', () => {
    const { getByText, queryByText } = render(
      <ErrorState state={{ kind: 'fatal', userMessageKey: 'error.validation' }} />,
    )
    expect(getByText('error.validation')).toBeTruthy()
    expect(queryByText('common.retry')).toBeNull()
  })

  it('renders testID when provided', () => {
    const { getByTestId } = render(<ErrorState state={{ kind: 'offline' }} testID="err-state" />)
    expect(getByTestId('err-state')).toBeTruthy()
  })
})
