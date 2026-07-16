import type { Money, Rate, Sourced } from '@eltizamati/domain'
import { formatMoney, formatRate } from '@/format/money'
import { ProvenanceBadge } from './provenance-badge'

export function SourcedMoneyValue({ sourced }: { sourced: Sourced<Money> | undefined }) {
  if (sourced === undefined)
    return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
  return (
    <span className="figure">
      {formatMoney(sourced.value)}
      <ProvenanceBadge source={sourced.provenance.source} />
    </span>
  )
}

export function SourcedRateValue({ sourced }: { sourced: Sourced<Rate> | undefined }) {
  if (sourced === undefined)
    return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
  return (
    <span className="figure">
      {formatRate(sourced.value)}
      <ProvenanceBadge source={sourced.provenance.source} />
    </span>
  )
}
