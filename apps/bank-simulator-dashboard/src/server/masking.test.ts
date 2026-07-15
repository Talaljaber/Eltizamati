import { describe, expect, it } from 'vitest'
import { maskClientName } from './masking'

describe('maskClientName', () => {
  it('keeps the first name and initials subsequent names', () => {
    expect(maskClientName('Talal Jaber', 'user-1')).toBe('Talal J.')
  })

  it('initials every name after the first', () => {
    expect(maskClientName('Ahmad Al Rashid', 'user-1')).toBe('Ahmad A. R.')
  })

  it('leaves a single-word name unmasked', () => {
    expect(maskClientName('Talal', 'user-1')).toBe('Talal')
  })

  it('falls back to an id-derived label when no name is on file', () => {
    expect(maskClientName(undefined, 'demo-user-0000-1234')).toBe('Client •1234')
  })

  it('falls back for a blank name', () => {
    expect(maskClientName('   ', 'demo-user-0000-5678')).toBe('Client •5678')
  })
})
