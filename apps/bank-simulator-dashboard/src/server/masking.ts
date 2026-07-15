/**
 * Client-name masking for the client directory (docs/dashboard.md §7.B:
 * "masked client name"). This is a demo dashboard over real allowlisted
 * test accounts, not a public directory — masking keeps the UI honest about
 * not being a full-PII admin view even though the underlying data is real.
 */

/**
 * Keeps the first name, reduces every subsequent name to an initial:
 * "Talal Jaber" -> "Talal J.". A single-word name is left as-is (nothing to
 * mask beyond it). Falls back to a stable id-derived label when no name is
 * on file yet (`profiles.full_name` is nullable — see the design doc).
 */
export function maskClientName(fullName: string | undefined, userId: string): string {
  if (fullName === undefined || fullName.trim().length === 0) {
    return `Client •${userId.slice(-4)}`
  }
  const parts = fullName.trim().split(/\s+/)
  const [first, ...rest] = parts
  if (rest.length === 0) return first as string
  return `${first} ${rest.map((part) => `${part.charAt(0).toUpperCase()}.`).join(' ')}`
}
