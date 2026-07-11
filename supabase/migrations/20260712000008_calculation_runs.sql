-- calculation_runs. Mirrors domain CalculationRun. outcome_kind implements the
-- CalculationOutcome result/refused split (PHASE-02-DECISION-LOG.md §7) — confidence is only
-- ever populated for 'result', never for 'refused'. database-schema.md §1.8.

create table public.calculation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable for aggregate (aggregates.v1) runs spanning multiple obligations.
  obligation_id uuid,
  -- Opaque reference to the finance-engine registry — this table never imports the engine's
  -- FormulaId type (ADR-0007: finance-engine depends on domain, never the reverse).
  formula_id text not null,
  formula_version integer not null,
  -- Explicit, never derived from a clock (BR-CALC-001).
  as_of date not null,
  -- Canonical JSON snapshot (canonicalStringify output, parsed).
  inputs_json jsonb not null,
  -- hashCanonicalJson(inputs_json) — SHA-256 hex digest, reproducibility check (INV-5). A
  -- genuine cryptographic hash, used here only for change-detection, not as an audit/integrity
  -- signature (PHASE-02-DECISION-LOG.md §7, revised in the Phase 3 readiness pass).
  inputs_hash text not null,
  outcome_kind text not null check (outcome_kind in ('result', 'refused')),
  confidence text check (confidence in ('official', 'high', 'medium', 'low')),
  -- Per-formula shape (e.g. ScheduleEntry[]) is defined in packages/finance-engine, Phase 6,
  -- and is opaque here.
  result_json jsonb,
  -- Field refs the engine could not resolve (BR-CALC-016).
  missing_fields_json jsonb,
  -- Optional, honestly-limited partial view when refused.
  partial_json jsonb,
  assumptions_json jsonb not null,
  calculated_at timestamptz not null,

  -- database-schema.md §1.11: when obligation_id is set, it must belong to this same user.
  -- Postgres's default MATCH SIMPLE foreign-key semantics skip this check whenever any column
  -- in the composite is NULL, so aggregate runs (obligation_id null) are unaffected — the
  -- direct user_id -> auth.users FK above is what keeps those rows valid.
  constraint calculation_runs_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade,

  constraint calculation_runs_outcome_shape_check
    check (
      (
        outcome_kind = 'result'
        and confidence is not null
        and result_json is not null
        and missing_fields_json is null
      )
      or (
        outcome_kind = 'refused'
        and confidence is null
        and result_json is null
        and missing_fields_json is not null
      )
    )
);

comment on table public.calculation_runs is
  'Mirrors domain CalculationRun. Immutable once written — a re-run inserts a new row.';

create index calculation_runs_obligation_formula_created_idx
  on public.calculation_runs (obligation_id, formula_id, created_at desc);
create index calculation_runs_user_id_idx on public.calculation_runs (user_id);

alter table public.calculation_runs enable row level security;

create policy calculation_runs_select on public.calculation_runs
  for select using (user_id = auth.uid());

-- Written by application services on behalf of the user's own session (never client-composed
-- financial values — the engine computes them); no update policy (immutable once written).
create policy calculation_runs_insert on public.calculation_runs
  for insert with check (user_id = auth.uid());

create policy calculation_runs_delete on public.calculation_runs
  for delete using (user_id = auth.uid());
