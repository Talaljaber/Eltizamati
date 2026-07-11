import { makeError } from '@eltizamati/domain'
import { toErrorUiState } from '../error-ui-state'

describe('toErrorUiState', () => {
  it('maps "connectivity" to offline', () => {
    expect(toErrorUiState(makeError('connectivity'))).toEqual({ kind: 'offline' })
  })

  it('maps "auth" to authRequired', () => {
    expect(toErrorUiState(makeError('auth'))).toEqual({ kind: 'authRequired' })
  })

  it('maps "authorization" to authRequired', () => {
    expect(toErrorUiState(makeError('authorization'))).toEqual({ kind: 'authRequired' })
  })

  it('maps a retryable, non-auth/connectivity error to retryable with its message key', () => {
    expect(toErrorUiState(makeError('storage'))).toEqual({
      kind: 'retryable',
      userMessageKey: 'error.storage',
    })
  })

  it('maps a non-retryable error to fatal with its message key', () => {
    expect(toErrorUiState(makeError('validation'))).toEqual({
      kind: 'fatal',
      userMessageKey: 'error.validation',
    })
  })
})
