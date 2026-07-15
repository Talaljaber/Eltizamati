import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../core/supabase/database.types'

const LOCAL_MAILPIT_URL = 'http://127.0.0.1:54324'
const OTP_PATTERN = /\b(\d{8})\b/
const LOCAL_TEST_PASSWORD = 'Local-only-Test-Password-1!'
const verifiedEmails = new Set<string>()

async function readLatestOtp(email: string): Promise<string> {
  const deadline = Date.now() + 10_000
  const query = encodeURIComponent(`to:${email}`)
  while (Date.now() < deadline) {
    const response = await fetch(`${LOCAL_MAILPIT_URL}/view/latest.txt?query=${query}`)
    if (response.ok) {
      const body = await response.text()
      const match = OTP_PATTERN.exec(body)
      if (match?.[1] !== undefined) return match[1]
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100))
  }
  // eslint-disable-next-line no-restricted-syntax -- integration setup fail-fast
  throw new Error('Mailpit did not receive an eight-digit OTP before the integration timeout')
}

export async function authenticateWithLocalEmailOtp(
  client: SupabaseClient<Database>,
  email: string,
): Promise<string> {
  if (verifiedEmails.has(email)) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: LOCAL_TEST_PASSWORD,
    })
    // eslint-disable-next-line no-restricted-syntax -- integration setup fail-fast
    if (error !== null) throw new Error(`Password sign-in failed: ${error.code}`)
    // eslint-disable-next-line no-restricted-syntax -- integration setup fail-fast
    if (data.session === null) throw new Error('Password sign-in returned no session')
    return data.session.user.id
  }

  const { error: signupError } = await client.auth.signUp({
    email,
    password: LOCAL_TEST_PASSWORD,
  })
  // eslint-disable-next-line no-restricted-syntax -- integration setup fail-fast
  if (signupError !== null) throw new Error(`Signup failed: ${signupError.code}`)
  const token = await readLatestOtp(email)
  const { data, error: verifyError } = await client.auth.verifyOtp({ email, token, type: 'email' })
  // eslint-disable-next-line no-restricted-syntax -- integration setup fail-fast
  if (verifyError !== null) throw new Error(`OTP verification failed: ${verifyError.code}`)
  // eslint-disable-next-line no-restricted-syntax -- integration setup fail-fast
  if (data.session === null) throw new Error('OTP verification returned no session')
  verifiedEmails.add(email)
  return data.session.user.id
}
