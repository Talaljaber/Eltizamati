/**
 * ConsentRecord — domain-model.md §3.5. Local acknowledgment in MVP demo mode;
 * server-backed rows under RLS in personal mode (both via the same
 * `ConsentRepository` contract — contracts/repositories.ts).
 */
import type { Id } from '../value-objects/id.js'

export interface ConsentRecord {
  readonly id: Id<'consentRecord'>
  readonly userId: Id<'user'>
  readonly docType: string
  readonly version: string
  readonly locale: 'en' | 'ar'
  readonly acknowledgedAt: string
}
