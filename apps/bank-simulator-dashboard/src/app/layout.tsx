import type { Metadata } from 'next'
import { DemoBanner } from '@/components/demo-banner'
import { AppNav } from '@/components/nav'
import { getLocale } from '@/i18n/locale'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eltizamati Bank Simulator',
  description: 'Demo institution and regulatory operations portal',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <DemoBanner locale={locale} />
        <div className="app-shell">
          <AppNav locale={locale} />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  )
}
