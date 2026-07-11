-- card_details (kind = creditCard). Mirrors domain CardDetails. minimum_payment_rule_json and
-- fees_json hold the two genuinely polymorphic small bags (ADR-0008 alternative 3 — JSON
-- retained only for these, never for core queryable fields). database-schema.md §1.5.

create table public.card_details (
  obligation_id uuid primary key,
  user_id uuid not null,

  credit_limit numeric(14, 3) not null,
  credit_limit_prov jsonb not null,
  current_balance numeric(14, 3) not null,
  current_balance_prov jsonb not null,
  statement_balance numeric(14, 3),
  statement_balance_prov jsonb,
  statement_date date,
  -- {"type":"percent","value":"3","floor":"10"} | {"type":"fixed","value":"25"} | {"type":"unknown"}
  -- money/percentage as decimal strings; 'unknown' is never silently omitted (BR-CALC-016).
  minimum_payment_rule_json jsonb,
  purchase_apr numeric(9, 6),
  purchase_apr_prov jsonb,
  cash_advance_apr numeric(9, 6),
  cash_advance_apr_prov jsonb,
  due_date date,
  grace_days integer,
  -- array of {"type":"annual"|"late"|"cashAdvance"|"other","amount":"50","amount_prov":{...},
  -- "description?":"..."} — contractual fee line items only (PHASE-02-DECISION-LOG.md §3); no
  -- charged-fee-occurrence history table exists.
  fees_json jsonb,

  constraint card_details_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade,

  constraint card_details_min_payment_rule_type_check
    check (
      minimum_payment_rule_json is null
      or minimum_payment_rule_json ->> 'type' in ('percent', 'fixed', 'unknown')
    )
);

comment on table public.card_details is
  'kind=creditCard detail row. Mirrors domain CardDetails.';

create index card_details_user_id_idx on public.card_details (user_id);

alter table public.card_details enable row level security;

create policy card_details_select on public.card_details
  for select using (user_id = auth.uid());

create policy card_details_insert on public.card_details
  for insert with check (user_id = auth.uid());

create policy card_details_update on public.card_details
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy card_details_delete on public.card_details
  for delete using (user_id = auth.uid());
