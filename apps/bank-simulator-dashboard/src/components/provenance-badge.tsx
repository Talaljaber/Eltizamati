import type { SourceClass } from '@eltizamati/domain'

/**
 * Every material figure renders its source class (docs/dashboard.md §7.C,
 * data-provenance.md BR-PROV-002). Demo-sourced data is styled as official
 * per data-provenance.md §2, but this dashboard is explicit that it is
 * demo/test data everywhere else (the permanent banner) — this badge alone
 * never claims "official bank data".
 */
const LABEL: Record<SourceClass, string> = {
  official: 'Official',
  bureau: 'Bureau',
  userEntered: 'Your entry',
  estimate: 'Estimate',
  demo: 'Demo',
}

export function ProvenanceBadge({ source }: { source: SourceClass }) {
  return (
    <span
      className="status-pill"
      style={{
        background: source === 'estimate' ? 'var(--color-gold-100)' : 'var(--color-teal-100)',
        color: source === 'estimate' ? 'var(--color-gold-500)' : 'var(--color-teal-600)',
        marginInlineStart: 6,
      }}
    >
      {LABEL[source]}
    </span>
  )
}
