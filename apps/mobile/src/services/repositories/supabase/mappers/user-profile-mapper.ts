/**
 * profiles row <-> UserProfile mapper (system-architecture.md §2 rule 3 —
 * raw rows never cross the infrastructure boundary). `locale`/`data_mode`
 * are validated here even though the DB CHECK constraint already restricts
 * them: generated types widen both columns to `string`, and a service-role
 * write or a future constraint change should fail loudly at this boundary
 * rather than silently mislabel a row.
 */
import { brandId, DomainInvariantError, type DataMode, type UserProfile } from '@eltizamati/domain'
import type { Database } from '../../../../core/supabase/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

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
    bankConnectOnboardingVersion: row.bank_connect_onboarding_version ?? undefined,
  }
}

export function profileDomainToRow(profile: UserProfile): ProfileInsert {
  return {
    user_id: profile.userId,
    locale: profile.locale,
    data_mode: profile.dataMode,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    full_name: profile.fullName ?? null,
    phone_number: profile.phoneNumber ?? null,
    primary_bank: profile.primaryBank ?? null,
    reminder_day_of_month: profile.reminderDayOfMonth ?? null,
    user_threshold_amount:
      profile.userThresholdAmount === undefined ? null : Number(profile.userThresholdAmount),
  }
}

/**
 * New profiles do not yet have user preferences. Omit those optional columns
 * from the insert instead of sending explicit nulls, so signup provisioning is
 * independent from later preference configuration.
 */
export function profileDomainToInsertRow(profile: UserProfile): ProfileInsert {
  const insert = { ...profileDomainToRow(profile) }
  delete insert.reminder_day_of_month
  delete insert.user_threshold_amount
  return insert
}
