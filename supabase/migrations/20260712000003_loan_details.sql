-- loan_details (kind = conventionalLoan). Mirrors domain ConventionalLoanDetails. 1:1 with
-- obligations. Rate history is NOT stored here — see rate_periods (BR-OBL-002 lives entirely
-- in that append-only table). database-schema.md §1.3.

create table public.loan_details (
  obligation_id uuid primary key,
  user_id uuid not null,

  original_principal numeric(14, 3) not null,
  original_principal_prov jsonb not null,
  outstanding_balance numeric(14, 3),
  outstanding_balance_prov jsonb,
  installment numeric(14, 3) not null,
  installment_prov jsonb not null,
  rate_type text not null check (rate_type in ('fixed', 'variable', 'mixed', 'unknown')),
  term_months integer not null check (term_months > 0),
  term_months_prov jsonb not null,
  start_date date not null,
  maturity_date date not null,
  first_payment_date date,
  payment_frequency text not null default 'monthly' check (payment_frequency = 'monthly'),
  purpose text check (purpose in ('personal', 'auto', 'housing', 'other')),
  contractual_balloon numeric(14, 3),
  contractual_balloon_prov jsonb,

  -- database-schema.md §1.11: composite FK enforces obligation_id's owner matches user_id —
  -- Postgres rejects the row outright if they disagree, not just RLS/app-code discipline.
  -- This single constraint also implies obligation_id references a real obligations.id (via
  -- the composite unique target), so no separate single-column FK is declared.
  constraint loan_details_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade
);

comment on table public.loan_details is
  'kind=conventionalLoan detail row. Mirrors domain ConventionalLoanDetails.';

create index loan_details_user_id_idx on public.loan_details (user_id);

alter table public.loan_details enable row level security;

create policy loan_details_select on public.loan_details
  for select using (user_id = auth.uid());

create policy loan_details_insert on public.loan_details
  for insert with check (user_id = auth.uid());

create policy loan_details_update on public.loan_details
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy loan_details_delete on public.loan_details
  for delete using (user_id = auth.uid());
