import type { RateType } from '@eltizamati/domain'

export interface LoanFormState {
  nickname: string
  institutionName: string
  openedDate: string
  originalPrincipal: string
  outstandingBalance: string
  installment: string
  rateType: RateType
  annualRatePercent: string
  termMonths: string
  startDate: string
  maturityDate: string
}

export const emptyLoanFormState: LoanFormState = {
  nickname: '',
  institutionName: '',
  openedDate: '',
  originalPrincipal: '',
  outstandingBalance: '',
  installment: '',
  rateType: 'fixed',
  annualRatePercent: '',
  termMonths: '',
  startDate: '',
  maturityDate: '',
}

export interface MurabahaFormState {
  nickname: string
  institutionName: string
  openedDate: string
  totalSalePrice: string
  assetCost: string
  disclosedProfit: string
  installment: string
  termMonths: string
  startDate: string
  profitRateDisclosedPercent: string
}

export const emptyMurabahaFormState: MurabahaFormState = {
  nickname: '',
  institutionName: '',
  openedDate: '',
  totalSalePrice: '',
  assetCost: '',
  disclosedProfit: '',
  installment: '',
  termMonths: '',
  startDate: '',
  profitRateDisclosedPercent: '',
}

export interface CardFormState {
  nickname: string
  institutionName: string
  openedDate: string
  creditLimit: string
  currentBalance: string
  purchaseAprPercent: string
  cashAdvanceAprPercent: string
  dueDate: string
}

export const emptyCardFormState: CardFormState = {
  nickname: '',
  institutionName: '',
  openedDate: '',
  creditLimit: '',
  currentBalance: '',
  purchaseAprPercent: '',
  cashAdvanceAprPercent: '',
  dueDate: '',
}

export const RATE_TYPES: readonly RateType[] = ['fixed', 'variable', 'mixed', 'unknown']
