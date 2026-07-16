/**
 * profiles row -> UserProfile mapper (read-only). Mirrors
 * apps/mobile/.../mappers/user-profile-mapper.ts's `profileRowToDomain`.
 */
import { brandId, DomainInvariantError, type DataMode, type UserProfile } from '@eltizamati/domain'
import type { Database } from '../supabase/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

function toLocale(value: string): 'en' | 'ar' {
  if (value === 'en' || value === 'ar') return value
  throw new DomainInvariantError('validation', `Unexpected profiles.locale value: "${value}"`)
}

function toDataMode(value: string): DataMode {
  if (value === 'demo' || value === 'personal') return value
  throw new DomainInvariantError('validation', `Unexpected profiles.data_mode value: "${value}"`)
}

export function profileRowToDomain(row: ProfileRow): UserProfile {
  return {
    userId: brandId<'user'>(row.user_id),
    locale: toLocale(row.locale),
    dataMode: toDataMode(row.data_mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fullName: row.full_name ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    primaryBank: row.primary_bank ?? undefined,
    reminderDayOfMonth: row.reminder_day_of_month ?? undefined,
    userThresholdAmount:
      row.user_threshold_amount === null || row.user_threshold_amount === undefined
        ? undefined
        : String(row.user_threshold_amount),
    email: row.email ?? undefined,
  }
}
