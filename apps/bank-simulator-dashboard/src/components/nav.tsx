'use client'

/** Primary navigation (docs/dashboard.md §14 nav list). */
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/clients', label: 'Clients' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/bank-rate-simulator', label: 'Bank Rate Simulator' },
  { href: '/benchmark-simulator', label: 'Benchmark Simulator' },
  { href: '/communications', label: 'Communications' },
  { href: '/activity-log', label: 'Activity Log' },
  { href: '/demo-settings', label: 'Demo Settings' },
] as const

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="app-nav" aria-label="Primary">
      <div className="app-nav-title">Eltizamati Bank Simulator</div>
      <div className="app-nav-subtitle">Demo institution and regulatory operations portal</div>
      <ul className="app-nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="app-nav-link"
              data-active={pathname === item.href ? 'true' : 'false'}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
