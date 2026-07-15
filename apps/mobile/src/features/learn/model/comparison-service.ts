import type { FinancingProduct, FinancingSearchRequest, ProductComparisonResult } from './catalogue'

export function comparePublishedProducts(
  products: readonly FinancingProduct[],
  request: FinancingSearchRequest,
): readonly ProductComparisonResult[] {
  return products
    .filter((product) => product.category === request.purpose)
    .map((product): ProductComparisonResult => {
      const matches: string[] = []
      const conflicts: string[] = []
      const unknowns: string[] = []
      if (request.structurePreference !== 'either') {
        const wanted =
          request.structurePreference === 'islamic'
            ? ['murabaha', 'ijara', 'diminishing-musharakah']
            : ['conventional-loan']
        ;(wanted.includes(product.structure) ? matches : conflicts).push('financing structure')
      }
      if (request.salaryTransferPreference === 'avoid') {
        ;(product.salaryTransfer === 'required'
          ? conflicts
          : product.salaryTransfer === 'not-published'
            ? unknowns
            : matches
        ).push('salary transfer')
      }
      if (request.salaryTransferPreference === 'required') {
        ;(product.salaryTransfer === 'required'
          ? matches
          : product.salaryTransfer === 'not-published'
            ? unknowns
            : conflicts
        ).push('salary transfer')
      }
      if (product.pricing.kind === 'not-published') unknowns.push('published pricing')
      if (product.completeness !== 'complete-published-fields') unknowns.push('some product fields')
      return {
        product,
        eligibilityState: 'unknown',
        matchedPreferences: matches,
        conflicts,
        unknowns,
        sourceIds: product.sourceIds,
        freshnessState:
          product.status === 'possibly-stale'
            ? 'stale'
            : product.status === 'active'
              ? 'current'
              : 'review-required',
      }
    })
    .sort(
      (a, b) => a.conflicts.length - b.conflicts.length || a.unknowns.length - b.unknowns.length,
    )
}
