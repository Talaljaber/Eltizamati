import { describe, expect, it } from 'vitest'
import { isUserAllowlisted } from './allowlist'

describe('allowlist (removed)', () => {
  it('permits every account now that the demo allowlist is gone', () => {
    expect(isUserAllowlisted('user-1')).toBe(true)
    expect(isUserAllowlisted('any-other-user')).toBe(true)
  })
})
