import { err, ok, type AppError, type Result } from '@eltizamati/domain'
import type { AuthService } from '@/services/auth/auth-service'
import {
  runLocalUserBoundaryCleanup,
  type LocalUserBoundaryCleanupDependencies,
} from './local-user-boundary-cleanup'

export type AuthExitKind = 'signOut' | 'deleteAccount'

export interface AuthExitOutcome {
  readonly exited: true
  readonly cleanupWarnings: readonly string[]
}

export interface AuthExitDependencies extends LocalUserBoundaryCleanupDependencies {
  readonly authService: AuthService
}

/**
 * Coordinates the irreversible boundary once, even if two UI events race.
 * Server deletion failure leaves the signed-in app intact; cleanup failures
 * after a successful auth transition are warnings and never reveal old data.
 */
export class AuthExitCoordinator {
  private inFlight: Promise<Result<AuthExitOutcome, AppError>> | undefined
  private completed: AuthExitOutcome | undefined

  constructor(private readonly dependencies: AuthExitDependencies) {}

  exit(kind: AuthExitKind): Promise<Result<AuthExitOutcome, AppError>> {
    if (this.completed !== undefined) return Promise.resolve(ok(this.completed))
    if (this.inFlight !== undefined) return this.inFlight
    this.inFlight = this.performExit(kind).finally(() => {
      this.inFlight = undefined
    })
    return this.inFlight
  }

  private async performExit(kind: AuthExitKind): Promise<Result<AuthExitOutcome, AppError>> {
    const authResult =
      kind === 'deleteAccount'
        ? await this.dependencies.authService.deleteAccount()
        : await this.dependencies.authService.signOut()
    if (!authResult.ok) return err(authResult.error)

    const deletionWarning =
      kind === 'deleteAccount'
        ? await this.dependencies.authService.clearLocalSession().then((result) =>
            result.ok ? undefined : 'local_session',
          )
        : undefined
    const cleanup = await runLocalUserBoundaryCleanup(this.dependencies)
    const outcome: AuthExitOutcome = {
      exited: true,
      cleanupWarnings: deletionWarning === undefined ? cleanup.warnings : ['local_session', ...cleanup.warnings],
    }
    this.completed = outcome
    return ok(outcome)
  }
}
