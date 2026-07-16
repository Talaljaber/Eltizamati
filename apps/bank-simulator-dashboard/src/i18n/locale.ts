/** Reads the dashboard's display-language preference from a plain cookie — no auth, no per-user state. */
import { cookies } from 'next/headers'
import { SUPPORTED_LOCALES, type Locale } from './translations'

export const LOCALE_COOKIE = 'dashboard_locale'

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value
  return SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'en'
}
