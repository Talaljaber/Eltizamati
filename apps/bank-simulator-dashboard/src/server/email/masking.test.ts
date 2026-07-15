import { describe, expect, it } from 'vitest'
import { hashEmail, maskEmail } from './masking'

describe('maskEmail', () => {
  it('masks the local part, keeping only the first character', () => {
    expect(maskEmail('talal@example.com')).toBe('t****@example.com')
  })

  it('pads short local parts to at least three stars', () => {
    expect(maskEmail('ab@example.com')).toBe('a***@example.com')
  })

  it('returns a safe fallback for a malformed address', () => {
    expect(maskEmail('not-an-email')).toBe('***')
  })
})

describe('hashEmail', () => {
  it('is deterministic and case/whitespace-insensitive', () => {
    const a = hashEmail('Talal@Example.com')
    const b = hashEmail('  talal@example.com  ')
    expect(a).toBe(b)
  })

  it('never contains the original address', () => {
    const hash = hashEmail('talal@example.com')
    expect(hash).not.toContain('talal')
    expect(hash).not.toContain('@')
  })
})
