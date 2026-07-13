import { brandId, type UserProfile } from '@eltizamati/domain'
import { profileDomainToRow, profileRowToDomain } from '../user-profile-mapper'
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
  }

  const profile: UserProfile = {
    userId: brandId('a0000000-0000-0000-0000-00000000000a'),
    locale: 'en',
    dataMode: 'personal',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    reminderDayOfMonth: undefined,
    userThresholdAmount: undefined,
  }

  it('profileRowToDomain maps every column to its domain field', () => {
    expect(profileRowToDomain(row)).toEqual(profile)
  })

  it('profileDomainToRow maps every domain field back to its column', () => {
    expect(profileDomainToRow(profile)).toEqual(row)
  })

  it('round-trips row -> domain -> row without loss', () => {
    expect(profileDomainToRow(profileRowToDomain(row))).toEqual(row)
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
    expect(profileDomainToRow(domain)).toEqual(rowWithPrefs)
  })
})
