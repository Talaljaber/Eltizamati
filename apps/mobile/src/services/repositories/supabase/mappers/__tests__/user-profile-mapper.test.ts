import { brandId, type UserProfile } from '@eltizamati/domain'
import {
  profileDomainToInsertRow,
  profileDomainToRow,
  profileRowToDomain,
} from '../user-profile-mapper'
import type { Database } from '../../../../../core/supabase/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

describe('user-profile-mapper', () => {
  const row: ProfileRow = {
    user_id: 'a0000000-0000-0000-0000-00000000000a',
    locale: 'en',
    data_mode: 'personal',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
    reminder_day_of_month: null,
    user_threshold_amount: null,
    full_name: null,
    phone_number: null,
    primary_bank: null,
    bank_connect_onboarding_version: null,
  }
  // profileDomainToRow deliberately never serializes this column — it is
  // written exclusively via markBankConnectComplete's column-scoped update,
  // so a full-row write from `profile` must never include it.
  const rowWithoutBankConnectColumn = (() => {
    const { bank_connect_onboarding_version: _omit, ...rest } = row
    return rest
  })()

  const profile: UserProfile = {
    userId: brandId('a0000000-0000-0000-0000-00000000000a'),
    locale: 'en',
    dataMode: 'personal',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    reminderDayOfMonth: undefined,
    userThresholdAmount: undefined,
    fullName: undefined,
    phoneNumber: undefined,
    primaryBank: undefined,
  }

  it('profileRowToDomain maps every column to its domain field', () => {
    expect(profileRowToDomain(row)).toEqual(profile)
  })

  it('profileDomainToRow maps every domain field back to its column', () => {
    expect(profileDomainToRow(profile)).toEqual(rowWithoutBankConnectColumn)
  })

  it('profileDomainToRow never serializes bank_connect_onboarding_version, even when the domain object carries one', () => {
    const withCompletion: UserProfile = { ...profile, bankConnectOnboardingVersion: 'v1' }
    expect(profileDomainToRow(withCompletion)).not.toHaveProperty(
      'bank_connect_onboarding_version',
    )
  })

  it('profileRowToDomain reads an existing bank_connect_onboarding_version value', () => {
    const domain = profileRowToDomain({ ...row, bank_connect_onboarding_version: 'v1' })
    expect(domain.bankConnectOnboardingVersion).toBe('v1')
  })

  it('omits unset preference columns from initial profile inserts', () => {
    expect(profileDomainToInsertRow(profile)).toEqual({
      user_id: profile.userId,
      locale: profile.locale,
      data_mode: profile.dataMode,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      full_name: null,
      phone_number: null,
      primary_bank: null,
    })
  })

  it('round-trips row -> domain -> row without loss (excluding bank_connect_onboarding_version, which is read-only through this path)', () => {
    expect(profileDomainToRow(profileRowToDomain(row))).toEqual(rowWithoutBankConnectColumn)
  })

  it('profileRowToDomain throws DomainInvariantError on an unexpected locale value', () => {
    expect(() => profileRowToDomain({ ...row, locale: 'fr' })).toThrow(
      /Unexpected profiles.locale value/,
    )
  })

  it('profileRowToDomain throws DomainInvariantError on an unexpected data_mode value', () => {
    expect(() => profileRowToDomain({ ...row, data_mode: 'guest' })).toThrow(
      /Unexpected profiles.data_mode value/,
    )
  })

  it('maps reminder_day_of_month and user_threshold_amount when set', () => {
    const rowWithPrefs: ProfileRow = {
      ...row,
      reminder_day_of_month: 5,
      user_threshold_amount: 150.5,
    }
    const domain = profileRowToDomain(rowWithPrefs)
    expect(domain.reminderDayOfMonth).toBe(5)
    expect(domain.userThresholdAmount).toBe('150.5')
    const { bank_connect_onboarding_version: _omit, ...rowWithPrefsWithoutBankConnect } =
      rowWithPrefs
    expect(profileDomainToRow(domain)).toEqual(rowWithPrefsWithoutBankConnect)
  })
})
