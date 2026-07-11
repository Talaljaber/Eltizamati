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
}
