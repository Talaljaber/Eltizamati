export function PhasePlaceholder({
  title,
  subtitle,
  plannedIn,
}: {
  readonly title: string
  readonly subtitle: string
  readonly plannedIn: string
}) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
      <div className="card">
        <p>
          Planned for {plannedIn} — see
          docs/10-implementation/features/BANK-SIMULATOR-DASHBOARD-DESIGN.md.
        </p>
      </div>
    </div>
  )
}
