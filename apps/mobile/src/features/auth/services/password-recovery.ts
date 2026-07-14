export const MIN_PASSWORD_LENGTH = 8

export type PasswordValidationError = 'tooShort' | 'mismatch' | undefined

export function validateRecoveredPassword(
  password: string,
  confirmation: string,
): PasswordValidationError {
  if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort'
  if (password !== confirmation) return 'mismatch'
  return undefined
}
