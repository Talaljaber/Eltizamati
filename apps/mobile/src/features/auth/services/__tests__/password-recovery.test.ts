import { MIN_PASSWORD_LENGTH, validateRecoveredPassword } from '../password-recovery'

describe('recovered password validation', () => {
  it('rejects a weak password before any provider call', () => {
    expect(validateRecoveredPassword('short', 'short')).toBe('tooShort')
    expect(MIN_PASSWORD_LENGTH).toBe(8)
  })

  it('rejects mismatched confirmation', () => {
    expect(validateRecoveredPassword('strong-pass', 'different')).toBe('mismatch')
  })

  it('accepts a matching password of the minimum length', () => {
    expect(validateRecoveredPassword('12345678', '12345678')).toBeUndefined()
  })
})
