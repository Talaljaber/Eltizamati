-- loan_applications: a mobile user's request to open a new conventional loan
-- (purpose, requested amount/term), reviewed by an admin on the bank
-- simulator dashboard. Unlike the demo_* tables (20260716000000), this is
-- real user-facing functionality with normal owner-scoped RLS — the
-- applicant can create and read their own applications, but status
-- transitions (approve/reject) only ever happen through the
-- demo_decide_loan_application SECURITY DEFINER RPC (service_role only),
-- mirroring rate_periods' append-only pattern: authenticated is granted
-- UPDATE at the table-privilege level for consistency with every other
-- owner-scoped table (20260712000011), but no RLS policy exists for
-- update/delete, so RLS's default-deny filters those operations to zero
-- affected rows rather than a hard permission error.

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  institution_name text not null,
  purpose text not null check (purpose in ('personal', 'auto', 'housing', 'other')),
  requested_amount numeric(14, 3) not null check (requested_amount > 0),
  requested_term_months integer not null check (requested_term_months > 0),
  applicant_note text,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  approved_amount numeric(14, 3),
  approved_term_months integer,
  approved_annual_rate numeric(9, 6),
  resulting_obligation_id uuid references public.obligations (id),

  decision_reason text,
  decided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- database-schema.md §1.11 precedent: a decided application must carry a
  -- resulting obligation if and only if it was approved, and must carry a
  -- reason if and only if it was rejected — never left ambiguous.
  constraint loan_applications_decision_shape check (
    (status = 'pending' and decided_at is null and resulting_obligation_id is null)
    or (status = 'approved' and decided_at is not null and resulting_obligation_id is not null)
    or (status = 'rejected' and decided_at is not null and decision_reason is not null
        and resulting_obligation_id is null)
  )
);

comment on table public.loan_applications is
  'A mobile user''s request to open a new conventional loan, reviewed by an admin on the bank simulator dashboard. Status transitions only happen via demo_decide_loan_application.';

create index loan_applications_user_id_idx on public.loan_applications (user_id);
create index loan_applications_status_idx on public.loan_applications (status);

create trigger loan_applications_set_updated_at
  before update on public.loan_applications
  for each row execute function public.set_updated_at();

alter table public.loan_applications enable row level security;

create policy loan_applications_select on public.loan_applications
  for select using (user_id = auth.uid());

create policy loan_applications_insert on public.loan_applications
  for insert with check (user_id = auth.uid() and status = 'pending');

grant select, insert, update, delete on public.loan_applications to authenticated;
grant select, insert, update, delete on public.loan_applications to service_role;
