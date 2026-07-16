import { t, type Locale } from '@/i18n/translations'

/** Permanent demo banner (docs/dashboard.md §2) — rendered on every page. */
export function DemoBanner({ locale }: { locale: Locale }) {
  return (
    <div className="demo-banner" role="status">
      {t(locale, 'demoBanner.text')}
    </div>
  )
}
