/**
 * UserProfile — domain-model.md §3.5.
 */
import type { Id } from '../value-objects/id.js'

export type DataMode = 'demo' | 'personal'

export interface UserProfile {
  readonly userId: Id<'user'>
  readonly locale: 'en' | 'ar'
  readonly dataMode: DataMode
  readonly createdAt: string
  readonly updatedAt: string
  /** Contact/profile details required for newly registered personal accounts. */
  readonly fullName?: string
  readonly phoneNumber?: string
  readonly primaryBank?: string
  /**
   * Denormalized copy of auth.users.email (20260716010000_profiles_email.sql), kept in
   * sync server-side — never authoritative, never client-writable. Lets server-only code
   * (e.g. the bank simulator dashboard) read a user's email from an allowlist-filtered
   * `profiles` query instead of calling the Supabase Admin API per user.
   */
  readonly email?: string
  /**
   * FR-SET-006 preferences. Notification delivery itself is out of MVP
   * scope (Phase 8 cut #3) — these are stored preferences only; nothing
   * currently schedules a reminder from `reminderDayOfMonth`.
   */
  readonly reminderDayOfMonth?: number
  /** FR-INS-001 "user-defined threshold" — decimal JOD string; undefined = not set. */
  readonly userThresholdAmount?: string
}
