import type { Metadata } from 'next'
import { DemoBanner } from '@/components/demo-banner'
import { AppNav } from '@/components/nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eltizamati Bank Simulator',
  description: 'Demo institution and regulatory operations portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <DemoBanner />
        <div className="app-shell">
          <AppNav />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  )
}
