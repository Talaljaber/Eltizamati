/**
 * BR-TERM-001 — Islamic obligation kinds must never render "interest" (or
 * "فائدة") anywhere in their detail screen, regardless of language. This
 * grep-over-the-render-tree test is the enforcement mechanism named in
 * content-terminology.md §1.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { buildDemoMurabaha, DEMO_DATE } from '@eltizamati/demo-data'
import { RepositoriesProvider } from '@/features/repositories/hooks/use-repositories'
import { MurabahaDetailSection } from '../MurabahaDetailSection'

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const obligation = buildDemoMurabaha(DEMO_DATE)
  const repos = {
    calculationRunRepository: {
      latestFor: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return render(
    <QueryClientProvider client={client}>
      <RepositoriesProvider repositories={repos}>
        <MurabahaDetailSection obligationId={obligation.id} obligation={obligation} />
      </RepositoriesProvider>
    </QueryClientProvider>,
  )
}

function flattenText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join(' ')
  if (node && typeof node === 'object' && 'children' in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return flattenText((node as any).children)
  }
  return ''
}

describe('MurabahaDetailSection — BR-TERM-001', () => {
  it('never renders "interest" in its render tree, in any casing', () => {
    const { toJSON } = renderSection()
    const text = flattenText(toJSON())
    expect(text.toLowerCase()).not.toContain('interest')
  })

  it('never renders the Arabic term "فائدة"', () => {
    const { toJSON } = renderSection()
    const text = flattenText(toJSON())
    expect(text).not.toContain('فائدة')
  })
})
