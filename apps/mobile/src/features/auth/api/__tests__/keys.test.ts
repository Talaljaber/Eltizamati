import { authKeys } from '../keys'

describe('authKeys', () => {
  it('session() is namespaced under "auth"', () => {
    expect(authKeys.session()).toEqual(['auth', 'session'])
  })

  it('profile(userId) is namespaced under "auth" and includes the userId', () => {
    expect(authKeys.profile('user-1')).toEqual(['auth', 'profile', 'user-1'])
  })

  it('different userIds produce different keys', () => {
    expect(authKeys.profile('user-1')).not.toEqual(authKeys.profile('user-2'))
  })
})
