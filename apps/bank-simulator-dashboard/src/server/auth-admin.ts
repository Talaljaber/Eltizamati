/**
 * The authentication email is not stored in `profiles` (confirmed against
 * the migrations — see the design doc). When a test user's email is
 * needed, it must come from the Supabase Admin API through the
 * service-role client, never assumed to live in any table.
 */
import { err, ok, makeError, type AppError, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from './supabase/client'

export async function getUserEmail(userId: string): Promise<Result<string | undefined, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.auth.admin.getUserById(userId)
  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { context: 'authAdminGetUserById' }, cause: error }),
    )
  }

  return ok(data.user?.email ?? undefined)
}

export async function getUserEmailsByUserId(
  userIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const entries = await Promise.all(
    userIds.map(async (userId) => {
      const result = await getUserEmail(userId)
      return result.ok && result.value !== undefined ? ([userId, result.value] as const) : undefined
    }),
  )
  return new Map(entries.filter((entry): entry is readonly [string, string] => entry !== undefined))
}
