export interface DonutChartDatum {
  readonly label: string
  readonly value: number
  readonly color: string
}

export interface DonutChartProps {
  readonly data: readonly DonutChartDatum[]
  readonly ariaLabel: string
  /** Shown in the donut's center — the one number this chart exists to headline. */
  readonly centerLabel: string
  readonly centerValue: string
}

const SIZE = 160
const CENTER = SIZE / 2
const RADIUS = 58
const STROKE_WIDTH = 26
const GAP_DEGREES = 2

function polarToCartesian(angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) }
}

function describeArc(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(endAngle)
  const end = polarToCartesian(startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

/**
 * Donut chart for a nominal-categorical composition (dataviz skill: fixed
 * hue order, round-capped segment ends doubling as the inter-segment gap,
 * a legend so identity is never color-alone, native `<title>` hover per
 * segment). The center headlines the one number the chart is really
 * answering — "how many, total" — per the mark-spec's single-headline idea.
 */
export function DonutChart({ data, ariaLabel, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const visible = data.filter((d) => d.value > 0)

  const halfGap = visible.length > 1 ? GAP_DEGREES / 2 : 0
  let cursor = 0
  const segments = visible.map((datum) => {
    const sweep = total === 0 ? 0 : (datum.value / total) * 360
    const segmentStart = cursor
    cursor += sweep
    const start = segmentStart + halfGap
    const end = Math.max(start, cursor - halfGap)
    return { ...datum, path: describeArc(start, end) }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--chart-gridline)"
          strokeWidth={STROKE_WIDTH}
        />
        {segments.map((segment) => {
          const percent = total === 0 ? 0 : Math.round((segment.value / total) * 100)
          const titleText = `${segment.label}: ${segment.value} (${percent}%)`
          return (
            <path
              key={segment.label}
              d={segment.path}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            >
              <title>{titleText}</title>
            </path>
          )
        })}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          style={{ fontSize: 20, fontWeight: 700, fill: 'var(--chart-ink-primary)' }}
        >
          {centerValue}
        </text>
        <text
          x={CENTER}
          y={CENTER + 16}
          textAnchor="middle"
          style={{ fontSize: 11, fill: 'var(--chart-ink-secondary)' }}
        >
          {centerLabel}
        </text>
      </svg>
      <div className="chart-legend" style={{ marginBlockStart: 0, flexDirection: 'column', gap: 6 }}>
        {visible.map((datum) => (
          <span key={datum.label} className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: datum.color }} />
            {datum.label} · {datum.value}
          </span>
        ))}
      </div>
    </div>
  )
}
