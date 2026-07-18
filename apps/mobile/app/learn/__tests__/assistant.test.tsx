import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import LearnAssistantScreen from '../assistant'
import { SupabaseLearningAssistantGateway } from '@/features/learn/model/supabase-learning-assistant-gateway'

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }))
jest.mock('@/features/learn/model/supabase-learning-assistant-gateway')

const MockGateway = SupabaseLearningAssistantGateway as jest.MockedClass<
  typeof SupabaseLearningAssistantGateway
>

// changeText and press must be separate fireEvent calls (not batched inside one
// act callback) — otherwise the Send button still sees the pre-typing (disabled)
// props and never fires onPress.
function typeAndSend(
  getByTestId: (id: string) => unknown,
  getByLabelText: (label: string) => unknown,
  text: string,
) {
  fireEvent.changeText(getByTestId('learn-assistant-input'), text)
  fireEvent.press(getByLabelText('learn.assistantSend'))
}

describe('LearnAssistantScreen — structured response rendering', () => {
  beforeEach(() => {
    MockGateway.mockClear()
  })

  it('renders assumptions, unknowns, and questions to ask the bank — not just the answer', async () => {
    MockGateway.prototype.answer = jest.fn().mockResolvedValue({
      ok: true,
      value: {
        answer: 'General financing works by repaying a principal over time.',
        comparison: null,
        assumptions: ['You have a stable income.'],
        unknowns: ['Your specific bank is unknown.'],
        questionsToAskTheBank: ['What is the effective annual rate?'],
        sourceIds: [],
        disclaimer: 'This is general education, not financial advice.',
        status: 'answered',
      },
    })

    const { getByTestId, getByLabelText, getByText } = render(<LearnAssistantScreen />)
    typeAndSend(getByTestId, getByLabelText, 'How do loans work?')

    await waitFor(() => {
      expect(getByText(/You have a stable income\./)).toBeTruthy()
    })
    expect(getByText(/Your specific bank is unknown\./)).toBeTruthy()
    expect(getByText(/What is the effective annual rate\?/)).toBeTruthy()
    expect(getByText('This is general education, not financial advice.')).toBeTruthy()
  })

  it('shows the insufficient-verified-data label distinctly', async () => {
    MockGateway.prototype.answer = jest.fn().mockResolvedValue({
      ok: true,
      value: {
        answer: '',
        comparison: null,
        assumptions: [],
        unknowns: ['No verified data for this institution.'],
        questionsToAskTheBank: [],
        sourceIds: [],
        disclaimer: '',
        status: 'insufficient-verified-data',
      },
    })

    const { getByTestId, getByLabelText, getByText } = render(<LearnAssistantScreen />)
    typeAndSend(getByTestId, getByLabelText, 'What is my exact rate?')

    await waitFor(() => {
      expect(getByText('learn.insufficientDataTitle')).toBeTruthy()
    })
  })

  it('shows the offline message with a retry action when the gateway fails', async () => {
    MockGateway.prototype.answer = jest
      .fn()
      .mockResolvedValue({ ok: false, error: { code: 'providerUnavailable' } })

    const { getByTestId, getByLabelText, getByText } = render(<LearnAssistantScreen />)
    typeAndSend(getByTestId, getByLabelText, 'How do loans work?')

    await waitFor(() => {
      expect(getByText('learn.assistantOffline')).toBeTruthy()
    })
    expect(getByText('common.retry')).toBeTruthy()
  })

  it('rejects a response that cites an un-retrieved source', async () => {
    MockGateway.prototype.answer = jest.fn().mockResolvedValue({
      ok: true,
      value: {
        answer: 'Here is an answer with a made-up citation.',
        comparison: null,
        assumptions: [],
        unknowns: [],
        questionsToAskTheBank: [],
        sourceIds: ['not-a-real-source'],
        disclaimer: '',
        status: 'answered',
      },
    })

    const { getByTestId, getByLabelText, getByText } = render(<LearnAssistantScreen />)
    typeAndSend(getByTestId, getByLabelText, 'How do loans work?')

    await waitFor(() => {
      expect(getByText('learn.assistantOffline')).toBeTruthy()
    })
  })
})
