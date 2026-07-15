import type { SignupProfileDetails } from '../stores/otp-attempt-store'

const E164_PHONE = /^\+[1-9]\d{7,14}$/

export function normalizeSignupProfile(
  input: SignupProfileDetails,
): SignupProfileDetails | undefined {
  const fullName = input.fullName.trim().replace(/\s+/g, ' ')
  const phoneNumber = input.phoneNumber.replace(/[\s()-]/g, '')
  const primaryBank = input.primaryBank.trim().replace(/\s+/g, ' ')
  if (fullName.length < 2 || fullName.length > 100) return undefined
  if (!E164_PHONE.test(phoneNumber)) return undefined
  if (primaryBank.length < 2 || primaryBank.length > 100) return undefined
  return { fullName, phoneNumber, primaryBank }
}
