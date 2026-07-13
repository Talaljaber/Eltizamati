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
  /**
   * FR-SET-006 preferences. Notification delivery itself is out of MVP
   * scope (Phase 8 cut #3) — these are stored preferences only; nothing
   * currently schedules a reminder from `reminderDayOfMonth`.
   */
  readonly reminderDayOfMonth?: number
  /** FR-INS-001 "user-defined threshold" — decimal JOD string; undefined = not set. */
  readonly userThresholdAmount?: string
}
