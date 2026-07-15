-- Bank Simulator Dashboard demo tables (docs/dashboard.md §16 + Phase 4).
--
-- These tables exist only to support the demo dashboard's own workflow —
-- they are never read or written by apps/mobile, and they never gain a
-- public/authenticated-facing RLS policy (docs/dashboard.md §16: "Do not
-- add a public admin policy to existing tables"). RLS is enabled on every
-- table below with *zero* policies for `authenticated`/`anon`, and no
-- GRANTs are issued to those roles either (belt and suspenders — the
-- existing grants migration, 20260712000011, proves a missing GRANT alone
-- already produces "permission denied" before RLS is even evaluated). Only
-- `service_role` — the only role the dashboard's server-side Supabase
-- client ever authenticates as — can read or write these tables.
--
-- `service_role` bypasses RLS entirely (that is the definition of the
-- service key), but RLS bypass is not the same thing as a table-privilege
-- bypass — GRANT/REVOKE is still enforced for service_role exactly as for
-- any other non-superuser role. demo_dashboard_activity's append-only
-- guarantee below is genuinely database-enforced, not merely application
-- discipline: service_role is granted SELECT and INSERT only on that table
-- (no UPDATE, no DELETE), so no SQL statement — including one issued from
-- this dashboard's own server code — can rewrite or remove an activity
-- row, only the SECURITY DEFINER function that inserts into it can act at
-- all beyond reading.

grant usage on schema public to service_role;

-- ─── demo_rate_campaigns ────────────────────────────────────────────────────

create table public.demo_rate_campaigns (
  id uuid primary key,
  campaign_name text not null,
  institution_name text not null,
  reason text,
  source_note text,
  -- Descriptive snapshot only — the authoritative "before" rate for each
  -- affected loan is that loan's own active rate_periods row, not this
  -- column (a campaign can target loans that were on slightly different
  -- rates before the change).
  old_annual_rate numeric(9, 6),
  new_annual_rate numeric(9, 6) not null,
  effective_date date not null,
  -- MVP eligibility (docs/dashboard.md correction, "## Eligibility") is
  -- conventional loans only — credit-card APR campaigns are an explicitly
  -- separate, not-yet-built flow.
  product_scope text not null default 'conventionalLoan' check (product_scope = 'conventionalLoan'),
  installment_policy text not null check (installment_policy in ('unchanged', 'recalculated', 'unknownTreatment')),
  email_notification_enabled boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'failed')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

comment on table public.demo_rate_campaigns is
  'Bank Rate Simulator campaign record (docs/dashboard.md §7.E). Demo-only, service-role-only.';

-- ─── demo_rate_campaign_targets ─────────────────────────────────────────────

create table public.demo_rate_campaign_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.demo_rate_campaigns (id) on delete cascade,
  obligation_id uuid not null,
  user_id uuid not null references auth.users (id),
  eligibility text not null check (eligibility in ('eligible', 'excluded')),
  -- Mirrors EligibilityExclusionReason in
  -- apps/bank-simulator-dashboard/src/server/rate-campaign-eligibility.ts —
  -- null exactly when eligibility = 'eligible'.
  exclusion_reason text,
  previous_rate_period_id uuid references public.rate_periods (id),
  new_rate_period_id uuid references public.rate_periods (id),
  calculation_run_id uuid references public.calculation_runs (id),
  created_at timestamptz not null default now(),

  constraint demo_rate_campaign_targets_unique unique (campaign_id, obligation_id),
  constraint demo_rate_campaign_targets_exclusion_shape_check check (
    (eligibility = 'eligible' and exclusion_reason is null)
    or (eligibility = 'excluded' and exclusion_reason is not null and new_rate_period_id is null)
  ),
  -- database-schema.md §1.11 pattern: a composite FK against obligations'
  -- own (id, user_id) unique key, so Postgres itself rejects a row whose
  -- user_id doesn't actually match its obligation_id's real owner — not
  -- just "trust the RPC got it right", since service_role can also INSERT
  -- into this table directly (it holds a plain, non-RPC-gated grant).
  constraint demo_rate_campaign_targets_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id)
);

comment on table public.demo_rate_campaign_targets is
  'One row per obligation a campaign considered, eligible or excluded, with the reason shown on screen.';

create index demo_rate_campaign_targets_campaign_id_idx
  on public.demo_rate_campaign_targets (campaign_id);

-- ─── demo_benchmark_rates ───────────────────────────────────────────────────

create table public.demo_benchmark_rates (
  id uuid primary key default gen_random_uuid(),
  benchmark_name text not null,
  previous_rate numeric(9, 6) not null,
  new_rate numeric(9, 6) not null,
  announcement_date date not null,
  effective_date date not null,
  explanation text,
  created_at timestamptz not null default now()
);

comment on table public.demo_benchmark_rates is
  'Simulated Central Bank benchmark record (docs/dashboard.md §7.F). Never auto-updates borrower contracts — no FK to obligations or rate_periods exists here on purpose.';

-- ─── demo_email_outbox ──────────────────────────────────────────────────────

create table public.demo_email_outbox (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.demo_rate_campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  locale text not null check (locale in ('en', 'ar')),
  -- One-way hash of the recipient address (never the raw address) plus a
  -- masked display form ("t***@example.com") — the outbox itself must never
  -- hold enough to reconstruct a real address (docs/dashboard.md §12/§13).
  recipient_hash text not null,
  recipient_masked text not null,
  template_id text not null,
  status text not null check (
    status in ('preview', 'queued', 'sent', 'failed', 'suppressed', 'sending-disabled')
  ),
  attempt_count integer not null default 0,
  -- Ensures duplicate processing does not send duplicate emails (docs/dashboard.md §12).
  idempotency_key text not null,
  safe_error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,

  constraint demo_email_outbox_idempotency_key_unique unique (idempotency_key)
);

comment on table public.demo_email_outbox is
  'Demo email outbox (docs/dashboard.md §12). Never stores a raw recipient address or the Gmail app password.';

create index demo_email_outbox_campaign_id_idx on public.demo_email_outbox (campaign_id);

-- ─── demo_dashboard_activity ────────────────────────────────────────────────

create table public.demo_dashboard_activity (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'campaign_created', 'campaign_previewed', 'rate_period_appended',
      'calculation_evaluated', 'insight_generated', 'email_queued',
      'email_sent', 'email_suppressed', 'operation_failed'
    )
  ),
  campaign_id uuid references public.demo_rate_campaigns (id) on delete set null,
  -- Short, safe description only — never full PII, balances, email
  -- addresses, tokens, or secrets (docs/dashboard.md §13).
  summary text not null,
  created_at timestamptz not null default now()
);

comment on table public.demo_dashboard_activity is
  'Demo activity log (docs/dashboard.md §13) — append-only, enforced by service_role holding SELECT/INSERT only (no UPDATE/DELETE grant exists). Not a production compliance audit system.';

create index demo_dashboard_activity_campaign_id_idx on public.demo_dashboard_activity (campaign_id);
create index demo_dashboard_activity_created_at_idx on public.demo_dashboard_activity (created_at desc);

-- ─── RLS: enabled everywhere, zero policies (service-role-only by construction) ─

alter table public.demo_rate_campaigns enable row level security;
alter table public.demo_rate_campaign_targets enable row level security;
alter table public.demo_benchmark_rates enable row level security;
alter table public.demo_email_outbox enable row level security;
alter table public.demo_dashboard_activity enable row level security;

-- ─── Explicit service_role GRANTs (self-documenting; Supabase's platform ────
-- setup already grants service_role broad access, but this repo's own
-- precedent — 20260712000011_grants.sql — is to never rely on an implicit
-- grant silently) ─────────────────────────────────────────────────────────

grant select, insert, update, delete on public.demo_rate_campaigns to service_role;
grant select, insert, update, delete on public.demo_rate_campaign_targets to service_role;
grant select, insert, update, delete on public.demo_benchmark_rates to service_role;
grant select, insert, update, delete on public.demo_email_outbox to service_role;
grant select, insert on public.demo_dashboard_activity to service_role;
