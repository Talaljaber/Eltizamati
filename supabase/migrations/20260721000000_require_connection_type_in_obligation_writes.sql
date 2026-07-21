-- F-07 follow-up (connect-plan.md review #1/#2): `save_conventional_loan` /
-- `save_murabaha` / `save_card` never wrote `connection_type`, so every write
-- through them silently fell to the table default 'official' — including
-- manually-entered loans that should be 'personal'. A defaulted
-- `p_connection_type text default 'official'` was rejected: (a) any missed
-- call site would silently become bank-authoritative, the exact failure mode
-- this column exists to prevent, and (b) a defaulted parameter cannot legally
-- precede the many non-defaulted parameters these functions already have.
-- `p_connection_type` is therefore REQUIRED — a caller that omits it fails
-- loudly instead of resolving to a wrong value.
--
-- `create or replace function` does NOT replace a function whose argument
-- list changes shape — Postgres treats it as a new overload, and the OLD
-- three-fewer-argument signatures would remain callable (and keep defaulting
-- to 'official') until explicitly dropped. Drop-then-create closes that hole.

drop function if exists public.save_conventional_loan(
  uuid, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, text, integer, jsonb,
  date, date, date, text, numeric, jsonb
);
drop function if exists public.save_murabaha(
  uuid, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, numeric, jsonb, integer, jsonb,
  date, numeric
);
drop function if exists public.save_card(
  uuid, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, date, jsonb,
  numeric, jsonb, numeric, jsonb, date, integer, jsonb
);

create function public.save_conventional_loan(
  p_id uuid,
  p_connection_type text,
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
  if p_connection_type not in ('personal', 'official') then
    raise exception 'save_conventional_loan: invalid connection_type %', p_connection_type using errcode = '22023';
  end if;

  insert into public.obligations
    (id, user_id, kind, connection_type, nickname, institution_name, institution_id, currency,
     opened_date, closed_date, notes, provenance_json, created_at, updated_at)
  values
    (p_id, v_user_id, 'conventionalLoan', p_connection_type, p_nickname, p_institution_name, p_institution_id, 'JOD',
     p_opened_date, p_closed_date, p_notes, p_provenance_json,
     coalesce(p_created_at, now()), coalesce(p_updated_at, now()))
  on conflict (id) do update set
    connection_type = excluded.connection_type,
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

create function public.save_murabaha(
  p_id uuid,
  p_connection_type text,
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
  if p_connection_type not in ('personal', 'official') then
    raise exception 'save_murabaha: invalid connection_type %', p_connection_type using errcode = '22023';
  end if;

  insert into public.obligations
    (id, user_id, kind, connection_type, nickname, institution_name, institution_id, currency,
     opened_date, closed_date, notes, provenance_json, created_at, updated_at)
  values
    (p_id, v_user_id, 'murabaha', p_connection_type, p_nickname, p_institution_name, p_institution_id, 'JOD',
     p_opened_date, p_closed_date, p_notes, p_provenance_json,
     coalesce(p_created_at, now()), coalesce(p_updated_at, now()))
  on conflict (id) do update set
    connection_type = excluded.connection_type,
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

create function public.save_card(
  p_id uuid,
  p_connection_type text,
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
  if p_connection_type not in ('personal', 'official') then
    raise exception 'save_card: invalid connection_type %', p_connection_type using errcode = '22023';
  end if;

  insert into public.obligations
    (id, user_id, kind, connection_type, nickname, institution_name, institution_id, currency,
     opened_date, closed_date, notes, provenance_json, created_at, updated_at)
  values
    (p_id, v_user_id, 'creditCard', p_connection_type, p_nickname, p_institution_name, p_institution_id, 'JOD',
     p_opened_date, p_closed_date, p_notes, p_provenance_json,
     coalesce(p_created_at, now()), coalesce(p_updated_at, now()))
  on conflict (id) do update set
    connection_type = excluded.connection_type,
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

-- SECURITY INVOKER (the default, unchanged) functions are still executable by
-- PUBLIC by default when newly created — close that immediately, exactly as
-- the original 20260715090000 migration granted only `authenticated`.
revoke all on function public.save_conventional_loan(
  uuid, text, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, text, integer, jsonb,
  date, date, date, text, numeric, jsonb
) from public;
revoke all on function public.save_murabaha(
  uuid, text, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, numeric, jsonb, integer, jsonb,
  date, numeric
) from public;
revoke all on function public.save_card(
  uuid, text, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, date, jsonb,
  numeric, jsonb, numeric, jsonb, date, integer, jsonb
) from public;

grant execute on function public.save_conventional_loan(
  uuid, text, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, text, integer, jsonb,
  date, date, date, text, numeric, jsonb
) to authenticated;
grant execute on function public.save_murabaha(
  uuid, text, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, numeric, jsonb, integer, jsonb,
  date, numeric
) to authenticated;
grant execute on function public.save_card(
  uuid, text, text, text, text, date, date, text, jsonb, timestamptz, timestamptz,
  numeric, jsonb, numeric, jsonb, numeric, jsonb, date, jsonb,
  numeric, jsonb, numeric, jsonb, date, integer, jsonb
) to authenticated;
