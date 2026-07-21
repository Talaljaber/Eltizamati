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

  async createIfAbsent(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const existing = this.#store.get(profile.userId)
    if (existing !== undefined) return ok(existing)
    this.#store.set(profile.userId, profile)
    return ok(profile)
  }

  async markBankConnectComplete(
    userId: Id<'user'>,
    version: string,
  ): Promise<Result<UserProfile, AppError>> {
    const existing = this.#store.get(userId)
    if (!existing) {
      return err(makeError('notFound', { safeMetadata: { entity: 'UserProfile' } }))
    }
    const updated: UserProfile = { ...existing, bankConnectOnboardingVersion: version }
    this.#store.set(userId, updated)
    return ok(updated)
  }

  reset(): void {
    this.#store.clear()
  }
}
