const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeAuthEmail(email: string): string | undefined {
  const normalized = email.trim().toLowerCase()
  return EMAIL_PATTERN.test(normalized) ? normalized : undefined
}
