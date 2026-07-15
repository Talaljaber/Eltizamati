/**
 * BR-TERM-001 — Islamic obligation kinds must never render "interest" (or
 * "فائدة") anywhere in their detail screen, regardless of language. This
 * grep-over-the-render-tree test is the enforcement mechanism named in
 * content-terminology.md §1.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Money } from '@eltizamati/domain'
import type { MurabahaFinancing, Provenance } from '@eltizamati/domain'
import { buildDemoMurabaha, DEMO_DATE } from '@eltizamati/demo-data'
import { RepositoriesProvider } from '@/features/repositories/hooks/use-repositories'
import { MurabahaDetailSection } from '../MurabahaDetailSection'

jest.mock('@/features/auth/hooks/use-active-user', () => ({ useActiveUser: () => 'demo-user' }))

const mountedSections: { readonly client: QueryClient; readonly unmount: () => void }[] = []

const officialProvenance: Provenance = {
  source: 'official',
  providerId: 'openbanking:roya',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

function renderSection(obligationOverride?: MurabahaFinancing) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const obligation = obligationOverride ?? buildDemoMurabaha(DEMO_DATE)
  const repos = {
    calculationRunRepository: {
      latestFor: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  const view = render(
    <QueryClientProvider client={client}>
      <RepositoriesProvider repositories={repos}>
        <MurabahaDetailSection obligationId={obligation.id} obligation={obligation} />
      </RepositoriesProvider>
    </QueryClientProvider>,
  )
  mountedSections.push({ client, unmount: view.unmount })
  return view
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
  afterEach(() => {
    for (const { client, unmount } of mountedSections.splice(0)) {
      unmount()
      client.clear()
    }
  })

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

describe('MurabahaDetailSection — F-08 provenance-aware money rendering', () => {
  afterEach(() => {
    for (const { client, unmount } of mountedSections.splice(0)) {
      unmount()
      client.clear()
    }
  })

  it('renders totalSalePrice/assetCost/disclosedProfit/installment as locale-formatted currency, not raw storage strings', () => {
    const base = buildDemoMurabaha(DEMO_DATE)
    const obligation: MurabahaFinancing = {
      ...base,
      murabahaDetails: {
        ...base.murabahaDetails,
        totalSalePrice: { value: Money.of('18600', 'JOD'), provenance: officialProvenance },
        assetCost: { value: Money.of('15000', 'JOD'), provenance: officialProvenance },
        disclosedProfit: { value: Money.of('3600', 'JOD'), provenance: officialProvenance },
        installment: { value: Money.of('221.429', 'JOD'), provenance: officialProvenance },
      },
    }
    const { getByText, queryByText } = renderSection(obligation)

    expect(getByText(/18,600/)).toBeTruthy()
    expect(getByText(/15,000/)).toBeTruthy()
    expect(getByText(/3,600/)).toBeTruthy()
    // The pre-fix behavior rendered the bare storage string with no grouping/currency.
    expect(queryByText('18600')).toBeNull()
    expect(queryByText('15000')).toBeNull()
    expect(queryByText('3600')).toBeNull()
  })
})
