import type { ReactNode } from 'react'
import { Card } from './Card'

export interface NavGroupProps {
  readonly children: ReactNode
  readonly testID?: string
}

/**
 * NavGroup — the shared grouping surface for a list of NavRows. Replaces
 * hand-rolled inline-styled grouping Views (DS-3: primitives single-sourced).
 */
export function NavGroup({ children, testID }: NavGroupProps) {
  return (
    <Card surface="flat" padding="none" testID={testID}>
      {children}
    </Card>
  )
}
