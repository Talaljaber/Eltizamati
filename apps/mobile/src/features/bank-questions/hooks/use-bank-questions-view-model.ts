import { useTranslation } from 'react-i18next'
import type { Id } from '@eltizamati/domain'

export interface BankQuestion {
  id: string
  text: string
}

export interface BankQuestionsViewModel {
  questions: BankQuestion[]
}

export function useBankQuestionsViewModel(_obligationId: Id<'obligation'>): BankQuestionsViewModel {
  const { t } = useTranslation()

  // MVP: static questions generated from the context of variable rate loans and residuals.
  const questions: BankQuestion[] = [
    {
      id: 'q1',
      text: t(
        'bankQuestions.q1',
        'What is the current outstanding principal and interest on this loan?',
      ),
    },
    {
      id: 'q2',
      text: t(
        'bankQuestions.q2',
        'Can you provide the exact calculation for the new installment amount after the recent rate increase?',
      ),
    },
    {
      id: 'q3',
      text: t(
        'bankQuestions.q3',
        'If I keep my installment unchanged, what is the estimated balloon payment at maturity?',
      ),
    },
    {
      id: 'q4',
      text: t(
        'bankQuestions.q4',
        'Are there any penalties for making extra monthly payments towards the principal?',
      ),
    },
    {
      id: 'q5',
      text: t(
        'bankQuestions.q5',
        'Can I extend the loan term to eliminate the residual risk without increasing my monthly installment?',
      ),
    },
  ]

  return { questions }
}
