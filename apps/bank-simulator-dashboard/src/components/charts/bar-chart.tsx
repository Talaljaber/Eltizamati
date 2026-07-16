export interface BarChartDatum {
  readonly label: string
  readonly value: number
  readonly color: string
  /** Pre-formatted value shown at the end of the row (e.g. "1,200 JOD"). Defaults to `value`. */
  readonly displayValue?: string
}

export interface BarChartProps {
  readonly data: readonly BarChartDatum[]
  readonly ariaLabel: string
}

/**
 * Horizontal bar chart (dataviz skill: thin marks, rounded 4px-equivalent
 * pill ends anchored to the baseline, direct value labels, no dual axis).
 * Callers pass an explicit `color` per row — ordinal distributions (balance
 * buckets, rate buckets, a maturity timeline) pass a single-hue ramp;
 * nominal distributions (provenance, delivery status) pass distinct
 * categorical/status hues. The bar itself stays a dumb, reusable primitive.
 */
export function BarChart({ data, ariaLabel }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="chart-bar-list" role="img" aria-label={ariaLabel}>
      {data.map((row) => (
        <div key={row.label} className="chart-bar-row" title={`${row.label}: ${row.displayValue ?? row.value}`}>
          <span style={{ fontSize: 13 }}>{row.label}</span>
          <span className="chart-bar-track">
            <span
              className="chart-bar-fill"
              style={{
                width: `${Math.round((row.value / max) * 100)}%`,
                background: row.color,
              }}
            />
          </span>
          <span className="figure" style={{ fontSize: 13 }}>
            {row.displayValue ?? row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
