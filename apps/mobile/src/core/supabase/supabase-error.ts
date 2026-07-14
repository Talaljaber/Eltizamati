import { makeError, type AppError } from '@eltizamati/domain'

export interface SupabaseErrorLike {
  readonly code?: string | undefined
  readonly message: string
  readonly status?: number | undefined
}

/** Classifies PostgREST/network failures without exposing provider messages to UI metadata. */
export function toSupabaseAppError(error: SupabaseErrorLike): AppError {
  const code = error.code ?? 'unknown'
  const message = error.message.toLowerCase()
  if (
    code === 'PGRST301' ||
    error.status === 401 ||
    message.includes('jwt expired') ||
    message.includes('invalid jwt')
  ) {
    return makeError('auth', { safeMetadata: { providerCode: code }, cause: error })
  }
  if (
    code === '42501' ||
    error.status === 403 ||
    message.includes('permission denied') ||
    message.includes('row-level security')
  ) {
    return makeError('authorization', {
      safeMetadata: { providerCode: code },
      cause: error,
    })
  }
  if (
    code === '57014' ||
    code === 'PGRST003' ||
    error.status === 408 ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return makeError('providerUnavailable', {
      safeMetadata: { providerCode: code },
      cause: error,
    })
  }
  if (message.includes('network request failed') || message.includes('failed to fetch')) {
    return makeError('connectivity', {
      safeMetadata: { providerCode: code },
      cause: error,
    })
  }
  if (error.status === 429) {
    return makeError('rateLimited', { safeMetadata: { providerCode: code }, cause: error })
  }
  return makeError('storage', {
    safeMetadata: { postgresErrorCode: code },
    cause: error,
  })
}
