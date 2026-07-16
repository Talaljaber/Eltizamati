import { NextResponse, type NextRequest } from 'next/server'
import { LOCALE_COOKIE } from '@/i18n/locale'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/translations'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function GET(request: NextRequest): NextResponse {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang')
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const response = NextResponse.redirect(new URL(redirectTo, request.url))

  if (SUPPORTED_LOCALES.includes(lang as Locale)) {
    response.cookies.set(LOCALE_COOKIE, lang as Locale, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      sameSite: 'lax',
    })
  }

  return response
}
