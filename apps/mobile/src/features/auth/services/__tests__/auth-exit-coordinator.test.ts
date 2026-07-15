import { err, makeError, ok } from '@eltizamati/domain'
import type { AuthService } from '@/services/auth/auth-service'
import { AuthExitCoordinator, type AuthExitDependencies } from '../auth-exit-coordinator'

function makeAuthService(): jest.Mocked<AuthService> {
  return {
    signUp: jest.fn(),
    signIn: jest.fn(),
    verifySignupOtp: jest.fn(),
    resendSignupOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue(ok(undefined)),
    clearLocalSession: jest.fn().mockResolvedValue(ok(undefined)),
    currentSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    deleteAccount: jest.fn().mockResolvedValue(ok(undefined)),
  }
}

function makeDependencies(authService = makeAuthService()): AuthExitDependencies {
  return {
    authService,
    cancelQueries: jest.fn().mockResolvedValue(undefined),
    clearQueryCache: jest.fn(),
    resetRuntime: jest.fn(),
    clearTrustState: jest.fn().mockResolvedValue(undefined),
    clearLocalConsent: jest.fn().mockResolvedValue(undefined),
    cancelReminder: jest.fn().mockResolvedValue(undefined),
    clearNotificationResponse: jest.fn().mockResolvedValue(undefined),
  }
}

describe('AuthExitCoordinator', () => {
  it('performs all cleanup and clears cached user data after sign-out', async () => {
    const dependencies = makeDependencies()
    const coordinator = new AuthExitCoordinator(dependencies)

    const result = await coordinator.exit('signOut')

    expect(result).toEqual({ ok: true, value: { exited: true, cleanupWarnings: [] } })
    expect(dependencies.authService.signOut).toHaveBeenCalledTimes(1)
    expect(dependencies.cancelQueries).toHaveBeenCalledTimes(1)
    expect(dependencies.clearQueryCache).toHaveBeenCalledTimes(1)
    expect(dependencies.resetRuntime).toHaveBeenCalledTimes(1)
    expect(dependencies.cancelReminder).toHaveBeenCalledTimes(1)
  })

  it('clears the local session explicitly after server-side account deletion', async () => {
    const dependencies = makeDependencies()
    const coordinator = new AuthExitCoordinator(dependencies)

    await coordinator.exit('deleteAccount')

    expect(dependencies.authService.deleteAccount).toHaveBeenCalledTimes(1)
    expect(dependencies.authService.clearLocalSession).toHaveBeenCalledTimes(1)
  })

  it('does not erase local state when server account deletion fails', async () => {
    const authService = makeAuthService()
    authService.deleteAccount.mockResolvedValue(err(makeError('connectivity')))
    const dependencies = makeDependencies(authService)
    const coordinator = new AuthExitCoordinator(dependencies)

    const result = await coordinator.exit('deleteAccount')

    expect(result.ok).toBe(false)
    expect(dependencies.clearQueryCache).not.toHaveBeenCalled()
    expect(dependencies.resetRuntime).not.toHaveBeenCalled()
  })

  it('contains partial cleanup failure and still removes the query cache', async () => {
    const dependencies = makeDependencies()
    ;(dependencies.cancelReminder as jest.Mock).mockRejectedValue(makeError('unexpected'))
    const coordinator = new AuthExitCoordinator(dependencies)

    const result = await coordinator.exit('signOut')

    expect(result).toEqual({
      ok: true,
      value: { exited: true, cleanupWarnings: ['reminder'] },
    })
    expect(dependencies.clearQueryCache).toHaveBeenCalledTimes(1)
  })

  it('is idempotent across repeated cleanup calls', async () => {
    const dependencies = makeDependencies()
    const coordinator = new AuthExitCoordinator(dependencies)

    await Promise.all([coordinator.exit('signOut'), coordinator.exit('signOut')])
    await coordinator.exit('signOut')

    expect(dependencies.authService.signOut).toHaveBeenCalledTimes(1)
    expect(dependencies.clearQueryCache).toHaveBeenCalledTimes(1)
  })
})
