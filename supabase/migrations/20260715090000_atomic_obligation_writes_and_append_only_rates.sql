-- F-07 (STOP-SHIP audit, docs/ship-situation.md): the client previously wrote the
-- base `obligations` row and its per-kind detail row as two separate network
-- operations (SupabaseObligationRepository.save) — a detail-write failure left a
-- committed base row with no matching detail row (`dataIncomplete` on next read,
-- and a "ghost" obligation in list/aggregate queries). A single PL/pgSQL function
-- call is one Postgres transaction: any exception inside it rolls back every
-- statement the function ran, so the two inserts either both land or neither does.
--
-- One RPC per schema-backed kind (not one generic jsonb RPC) so every column keeps
-- its real type/CHECK enforcement exactly as the direct-insert path already had —
-- no jsonb-shape parsing, no new validation surface to keep in sync by hand.
-- SECURITY INVOKER (the default) — RLS still applies to every statement the
-- function runs, so ownership is enforced by the same policies already proven by
-- 10_rls_cross_user.sql, not by a bespoke check.

create or replace function public.save_conventional_loan(
  p_id uuid,
  p_nickname text,
  p_institution_name text,
  p_institution_id text,
  p_opened_date date,
  p_closed_date date,
  p_notes text,
  p_provenance_json jsonb,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_original_principal numeric(14, 3),
  p_original_principal_prov jsonb,
  p_outstanding_balance numeric(14, 3),
  p_outstanding_balance_prov jsonb,
  p_installment numeric(14, 3),
  p_installment_prov jsonb,
  p_rate_type text,
  p_term_months integer,
  p_term_months_prov jsonb,
  p_start_date date,
  p_maturity_date date,
  p_first_payment_date date,
  p_purpose text,
  p_contractual_balloon numeric(14, 3),
  p_contractual_balloon_prov jsonb
) returns public.obligations
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.obligations;
begin
  if v_user_id is null then
    raise exception 'save_conventional_loan requires an authenticated caller' using errcode = '28000';
  end if;

  insert into public.obligations
    (id, user_id, kind, nickname, institution_name, institution_id, currency,
     opened_date, closed_date, notes, provenance_json, created_at, updated_at)
  values
    (p_id, v_user_id, 'conventionalLoan', p_nickname, p_institution_name, p_institution_id, 'JOD',
     p_opened_date, p_closed_date, p_notes, p_provenance_json,
     coalesce(p_created_at, now()), coalesce(p_updated_at, now()))
  on conflict (id) do update set
    nickname = excluded.nickname,
    institution_name = excluded.institution_name,
    institution_id = excluded.institution_id,
    opened_date = excluded.opened_date,
    closed_date = excluded.closed_date,
    notes = excluded.notes,
    provenance_json = excluded.provenance_json,
    updated_at = excluded.updated_at
  -- Ownership AND kind must both already match, or this update is a no-op (0 rows
  -- returned below) rather than silently repurposing another user's id or flipping
  -- an existing obligation's kind out from under its own detail table.
  where obligations.user_id = v_user_id and obligations.kind = 'conventionalLoan'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'obligation % is not an owned conventionalLoan', p_id using errcode = '42501';
  end if;

  insert into public.loan_details
    (obligation_id, user_id, original_principal, original_principal_prov,
     outstanding_balance, outstanding_balance_prov, installment, installment_prov,
     rate_type, term_months, term_months_prov, start_date, maturity_date,
     first_payment_date, purpose, contractual_balloon, contractual_balloon_prov)
  values
    (p_id, v_user_id, p_original_principal, p_original_principal_prov,
     p_outstanding_balance, p_outstanding_balance_prov, p_installment, p_installment_prov,
     p_rate_type, p_term_months, p_term_months_prov, p_start_date, p_maturity_date,
     p_first_payment_date, p_purpose, p_contractual_balloon, p_contractual_balloon_prov)
  on conflict (obligation_id) do update set
    original_principal = excluded.original_principal,
    original_principal_prov = excluded.original_principal_prov,
    outstanding_balance = excluded.outstanding_balance,
    outstanding_balance_prov = excluded.outstanding_balance_prov,
    installment = excluded.installment,
    installment_prov = excluded.installment_prov,
    rate_type = excluded.rate_type,
    term_months = excluded.term_months,
    term_months_prov = excluded.term_months_prov,
    start_date = excluded.start_date,
    maturity_date = excluded.maturity_date,
    first_payment_date = excluded.first_payment_date,
    purpose = excluded.purpose,
    contractual_balloon = excluded.contractual_balloon,
    contractual_balloon_prov = excluded.contractual_balloon_prov
  where loan_details.user_id = v_user_id;

  return v_row;
end;
$$;

create or replace function public.save_murabaha(
  p_id uuid,
  p_nickname text,
  p_institution_name text,
  p_institution_id text,
  p_opened_date date,
  p_closed_date date,
  p_notes text,
  p_provenance_json jsonb,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_asset_cost numeric(14, 3),
  p_asset_cost_prov jsonb,
  p_disclosed_profit numeric(14, 3),
  p_disclosed_profit_prov jsonb,
  p_total_sale_price numeric(14, 3),
  p_total_sale_price_prov jsonb,
  p_installment numeric(14, 3),
  p_installment_prov jsonb,
  p_term_months integer,
  p_term_months_prov jsonb,
  p_start_date date,
  p_profit_rate_disclosed numeric(9, 6)
) returns public.obligations
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.obligations;
begin
  if v_user_id is null then
    raise exception 'save_murabaha requires an authenticated caller' using errcode = '28000';
  end if;

  insert into public.obligations
    (id, user_id, kind, nickname, institution_name, institution_id, currency,
     opened_date, closed_date, notes, provenance_json, created_at, updated_at)
  values
    (p_id, v_user_id, 'murabaha', p_nickname, p_institution_name, p_institution_id, 'JOD',
     p_opened_date, p_closed_date, p_notes, p_provenance_json,
     coalesce(p_created_at, now()), coalesce(p_updated_at, now()))
  on conflict (id) do update set
    nickname = excluded.nickname,
    institution_name = excluded.institution_name,
    institution_id = excluded.institution_id,
    opened_date = excluded.opened_date,
    closed_date = excluded.closed_date,
    notes = excluded.notes,
    provenance_json = excluded.provenance_json,
    updated_at = excluded.updated_at
  where obligations.user_id = v_user_id and obligations.kind = 'murabaha'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'obligation % is not an owned murabaha', p_id using errcode = '42501';
  end if;

  insert into public.murabaha_details
    (obligation_id, user_id, asset_cost, asset_cost_prov, disclosed_profit, disclosed_profit_prov,
     total_sale_price, total_sale_price_prov, installment, installment_prov, term_months,
     term_months_prov, start_date, profit_rate_disclosed)
  values
    (p_id, v_user_id, p_asset_cost, p_asset_cost_prov, p_disclosed_profit, p_disclosed_profit_prov,
     p_total_sale_price, p_total_sale_price_prov, p_installment, p_installment_prov, p_term_months,
     p_term_months_prov, p_start_date, p_profit_rate_disclosed)
  on conflict (obligation_id) do update set
    asset_cost = excluded.asset_cost,
    asset_cost_prov = excluded.asset_cost_prov,
    disclosed_profit = excluded.disclosed_profit,
    disclosed_profit_prov = excluded.disclosed_profit_prov,
    total_sale_price = excluded.total_sale_price,
    total_sale_price_prov = excluded.total_sale_price_prov,
    installment = excluded.installment,
    installment_prov = excluded.installment_prov,
    term_months = excluded.term_months,
    term_months_prov = excluded.term_months_prov,
    start_date = excluded.start_date,
    profit_rate_disclosed = excluded.profit_rate_disclosed
  where murabaha_details.user_id = v_user_id;

  return v_row;
end;
$$;

create or replace function public.save_card(
  p_id uuid,
  p_nickname text,
  p_institution_name text,
  p_institution_id text,
  p_opened_date date,
  p_closed_date date,
  p_notes text,
  p_provenance_json jsonb,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_credit_limit numeric(14, 3),
  p_credit_limit_prov jsonb,
  p_current_balance numeric(14, 3),
  p_current_balance_prov jsonb,
  p_statement_balance numeric(14, 3),
  p_statement_balance_prov jsonb,
  p_statement_date date,
  p_minimum_payment_rule_json jsonb,
  p_purchase_apr numeric(9, 6),
  p_purchase_apr_prov jsonb,
  p_cash_advance_apr numeric(9, 6),
  p_cash_advance_apr_prov jsonb,
  p_due_date date,
  p_grace_days integer,
  p_fees_json jsonb
) returns public.obligations
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.obligations;
begin
  if v_user_id is null then
    raise exception 'save_card requires an authenticated caller' using errcode = '28000';
  end if;

  insert into public.obligations
    (id, user_id, kind, nickname, institution_name, institution_id, currency,
     opened_date, closed_date, notes, provenance_json, created_at, updated_at)
  values
    (p_id, v_user_id, 'creditCard', p_nickname, p_institution_name, p_institution_id, 'JOD',
     p_opened_date, p_closed_date, p_notes, p_provenance_json,
     coalesce(p_created_at, now()), coalesce(p_updated_at, now()))
  on conflict (id) do update set
    nickname = excluded.nickname,
    institution_name = excluded.institution_name,
    institution_id = excluded.institution_id,
    opened_date = excluded.opened_date,
    closed_date = excluded.closed_date,
    notes = excluded.notes,
    provenance_json = excluded.provenance_json,
    updated_at = excluded.updated_at
  where obligations.user_id = v_user_id and obligations.kind = 'creditCard'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'obligation % is not an owned creditCard', p_id using errcode = '42501';
  end if;

  insert into public.card_details
    (obligation_id, user_id, credit_limit, credit_limit_prov, current_balance, current_balance_prov,
     statement_balance, statement_balance_prov, statement_date, minimum_payment_rule_json,
     purchase_apr, purchase_apr_prov, cash_advance_apr, cash_advance_apr_prov, due_date,
     grace_days, fees_json)
  values
    (p_id, v_user_id, p_credit_limit, p_credit_limit_prov, p_current_balance, p_current_balance_prov,
     p_statement_balance, p_statement_balance_prov, p_statement_date, p_minimum_payment_rule_json,
     p_purchase_apr, p_purchase_apr_prov, p_cash_advance_apr, p_cash_advance_apr_prov, p_due_date,
     p_grace_days, p_fees_json)
  on conflict (obligation_id) do update set
    credit_limit = excluded.credit_limit,
    credit_limit_prov = excluded.credit_limit_prov,
    current_balance = excluded.current_balance,
    current_balance_prov = excluded.current_balance_prov,
    statement_balance = excluded.statement_balance,
    statement_balance_prov = excluded.statement_balance_prov,
    statement_date = excluded.statement_date,
    minimum_payment_rule_json = excluded.minimum_payment_rule_json,
    purchase_apr = excluded.purchase_apr,
    purchase_apr_prov = excluded.purchase_apr_prov,
    cash_advance_apr = excluded.cash_advance_apr,
    cash_advance_apr_prov = excluded.cash_advance_apr_prov,
    due_date = excluded.due_date,
    grace_days = excluded.grace_days,
    fees_json = excluded.fees_json
  where card_details.user_id = v_user_id;

  return v_row;
end;
$$;

grant execute on function public.save_conventional_loan to authenticated;
grant execute on function public.save_murabaha to authenticated;
grant execute on function public.save_card to authenticated;

-- F-07 (append-only rate history): the existing rate_periods_update RLS policy
-- correctly scopes rows to their owner, but RLS cannot restrict which *columns*
-- an UPDATE touches — an authenticated owner could rewrite annual_rate,
-- effective_from, or provenance_json on a historical row, defeating BR-RATE-001's
-- append-only guarantee. Column-level GRANTs are the smallest correct mechanism:
-- Postgres rejects any UPDATE statement naming a column outside the granted set,
-- regardless of RLS, before RLS is even evaluated. superseded_by is the one
-- column the approved correction/supersession event ever writes.
revoke update on public.rate_periods from authenticated;
grant update (superseded_by) on public.rate_periods to authenticated;
