import type { ReactNode } from 'react'

/**
 * Shared data-table chrome (docs/dashboard.md §14, Phase 5 hardening pass).
 * Every table in the app renders through these three primitives so column
 * padding, header treatment, row rules, and horizontal-scroll behavior never
 * drift page to page — previously each page hand-rolled its own inline
 * styles, and they'd quietly diverged (three different cell paddings, only
 * one page wrapping wide tables in a scroll container, headers with no
 * `scope` anywhere).
 */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="table-scroll">{children}</div>
}

export function Th({
  children,
  align,
}: {
  children?: ReactNode
  align?: 'start' | 'end'
}) {
  return (
    <th scope="col" style={align === 'end' ? { textAlign: 'end' } : undefined}>
      {children}
    </th>
  )
}

export function Td({
  children,
  align,
  className,
}: {
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  return (
    <td className={className} style={align === 'end' ? { textAlign: 'end' } : undefined}>
      {children}
    </td>
  )
}
