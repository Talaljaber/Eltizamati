'use client'

/** Primary navigation (docs/dashboard.md §14 nav list). */
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { t, type Locale, type TranslationKey } from '@/i18n/translations'

const NAV_ITEMS = [
  { href: '/', key: 'nav.overview' },
  { href: '/clients', key: 'nav.clients' },
  { href: '/portfolio', key: 'nav.portfolio' },
  { href: '/bank-rate-simulator', key: 'nav.bankRateSimulator' },
  { href: '/benchmark-simulator', key: 'nav.benchmarkSimulator' },
  { href: '/loan-applications', key: 'nav.loanApplications' },
  { href: '/communications', key: 'nav.communications' },
  { href: '/activity-log', key: 'nav.activityLog' },
  { href: '/demo-settings', key: 'nav.demoSettings' },
] as const satisfies readonly { href: string; key: TranslationKey }[]

export function AppNav({ locale }: { locale: Locale }) {
  const pathname = usePathname()

  return (
    <nav className="app-nav" aria-label="Primary">
      <div className="app-nav-title">{t(locale, 'nav.title')}</div>
      <div className="app-nav-subtitle">{t(locale, 'nav.subtitle')}</div>
      <ul className="app-nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="app-nav-link"
              data-active={pathname === item.href ? 'true' : 'false'}
            >
              {t(locale, item.key)}
            </Link>
          </li>
        ))}
      </ul>
      <div style={{ marginBlockStart: 'var(--space-4)', fontSize: 12 }}>
        <span style={{ opacity: 0.7 }}>{t(locale, 'nav.language')}: </span>
        <a
          href={`/locale?lang=en&redirectTo=${encodeURIComponent(pathname)}`}
          aria-current={locale === 'en' ? 'true' : undefined}
          style={{ fontWeight: locale === 'en' ? 700 : 400, marginInlineEnd: 8 }}
        >
          EN
        </a>
        <a
          href={`/locale?lang=ar&redirectTo=${encodeURIComponent(pathname)}`}
          aria-current={locale === 'ar' ? 'true' : undefined}
          style={{ fontWeight: locale === 'ar' ? 700 : 400 }}
        >
          AR
        </a>
      </div>
    </nav>
  )
}
