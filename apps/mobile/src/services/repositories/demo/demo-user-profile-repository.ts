/**
 * In-memory demo user-profile repository — Phase 5.
 * No Supabase imports.
 */

import {
  ok,
  err,
  makeError,
  type UserProfileRepository,
  type UserProfile,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

export class DemoUserProfileRepository implements UserProfileRepository {
  readonly #store = new Map<string, UserProfile>()

  async get(userId: Id<'user'>): Promise<Result<UserProfile, AppError>> {
    const profile = this.#store.get(userId)
    if (!profile) {
      return err(makeError('notFound', { safeMetadata: { entity: 'UserProfile' } }))
    }
    return ok(profile)
  }

  async save(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    this.#store.set(profile.userId, profile)
    return ok(profile)
  }

  reset(): void {
    this.#store.clear()
  }
}
