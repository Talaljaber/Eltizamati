import type { LoanFormState, MurabahaFormState, CardFormState } from './types'

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

export function isValidDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim())
}

export function isValidLocalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

export function isValidPositiveInt(value: string): boolean {
  return /^[1-9]\d*$/.test(value.trim())
}

export function validateLoanForm(state: LoanFormState, requireRate: boolean): string | undefined {
  if (!isNonEmpty(state.nickname)) return 'obligationForm.errors.nickname'
  if (!isNonEmpty(state.institutionName)) return 'obligationForm.errors.institutionName'
  if (!isValidLocalDate(state.openedDate)) return 'obligationForm.errors.date'
  if (!isValidDecimal(state.originalPrincipal)) return 'obligationForm.errors.amount'
  if (state.outstandingBalance !== '' && !isValidDecimal(state.outstandingBalance)) {
    return 'obligationForm.errors.amount'
  }
  if (!isValidDecimal(state.installment)) return 'obligationForm.errors.amount'
  if (requireRate && !isValidDecimal(state.annualRatePercent))
    return 'obligationForm.errors.percent'
  if (!isValidPositiveInt(state.termMonths)) return 'obligationForm.errors.termMonths'
  if (!isValidLocalDate(state.startDate)) return 'obligationForm.errors.date'
  if (!isValidLocalDate(state.maturityDate)) return 'obligationForm.errors.date'
  return undefined
}

export function validateMurabahaForm(state: MurabahaFormState): string | undefined {
  if (!isNonEmpty(state.nickname)) return 'obligationForm.errors.nickname'
  if (!isNonEmpty(state.institutionName)) return 'obligationForm.errors.institutionName'
  if (!isValidLocalDate(state.openedDate)) return 'obligationForm.errors.date'
  if (!isValidDecimal(state.totalSalePrice)) return 'obligationForm.errors.amount'
  if (!isValidDecimal(state.assetCost)) return 'obligationForm.errors.amount'
  if (!isValidDecimal(state.disclosedProfit)) return 'obligationForm.errors.amount'
  if (!isValidDecimal(state.installment)) return 'obligationForm.errors.amount'
  if (!isValidPositiveInt(state.termMonths)) return 'obligationForm.errors.termMonths'
  if (!isValidLocalDate(state.startDate)) return 'obligationForm.errors.date'
  if (
    state.profitRateDisclosedPercent !== '' &&
    !isValidDecimal(state.profitRateDisclosedPercent)
  ) {
    return 'obligationForm.errors.percent'
  }
  return undefined
}

export function validateCardForm(state: CardFormState): string | undefined {
  if (!isNonEmpty(state.nickname)) return 'obligationForm.errors.nickname'
  if (!isNonEmpty(state.institutionName)) return 'obligationForm.errors.institutionName'
  if (!isValidLocalDate(state.openedDate)) return 'obligationForm.errors.date'
  if (!isValidDecimal(state.creditLimit)) return 'obligationForm.errors.amount'
  if (!isValidDecimal(state.currentBalance)) return 'obligationForm.errors.amount'
  if (state.purchaseAprPercent !== '' && !isValidDecimal(state.purchaseAprPercent)) {
    return 'obligationForm.errors.percent'
  }
  if (state.cashAdvanceAprPercent !== '' && !isValidDecimal(state.cashAdvanceAprPercent)) {
    return 'obligationForm.errors.percent'
  }
  if (state.dueDate !== '' && !isValidLocalDate(state.dueDate)) {
    return 'obligationForm.errors.date'
  }
  return undefined
}
