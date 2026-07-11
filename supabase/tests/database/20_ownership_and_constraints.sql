-- pgTAP: composite ownership foreign keys (database-schema.md §1.11) and business-rule
-- constraints (BR-OBL-003, INV-2, BR-OBL-002, FR-INS-004, BR-CALC-016). Run as postgres
-- (superuser bypasses RLS) so these tests isolate constraint/FK behavior from RLS behavior,
-- which 10_rls_cross_user.sql already covers separately.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'user-a@eltizamati.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'user-b@eltizamati.test');

insert into public.obligations
  (id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json)
values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'conventionalLoan', 'Loan', 'Bank', 'JOD', '2024-01-15', '{}'),
  ('10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', 'conventionalLoan', 'Other Loan', 'Bank', 'JOD', '2024-01-15', '{}'),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'creditCard', 'Card', 'Bank', 'JOD', '2024-01-15', '{}');

-- ─── §1.11 composite ownership FK: a child row's user_id must match its parent's owner ──────

select throws_ok(
  $$insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov, rate_type, term_months, term_months_prov, start_date, maturity_date) values ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 20000, '{}', 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15')$$,
  '23503', null, 'loan_details: composite FK rejects a user_id that disagrees with the parent obligation''s owner'
);

select lives_ok(
  $$insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov, rate_type, term_months, term_months_prov, start_date, maturity_date) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 20000, '{}', 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15')$$,
  'loan_details: composite FK accepts a user_id that matches the parent obligation''s owner (positive control)'
);

-- Nullable-obligation_id tables (calculation_runs, insights): the composite FK is skipped
-- (MATCH SIMPLE) only for the aggregate/obligation-agnostic case (obligation_id null itself);
-- when obligation_id IS supplied, the mismatch is still rejected exactly like a required FK.
select throws_ok(
  $$insert into public.calculation_runs (user_id, obligation_id, formula_id, formula_version, as_of, inputs_json, inputs_hash, outcome_kind, confidence, result_json, assumptions_json, calculated_at) values ('b0000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'amortization', 1, '2026-07-01', '{}', 'abc', 'result', 'high', '{}', '[]', now())$$,
  '23503', null, 'calculation_runs: composite FK rejects a mismatched user_id when obligation_id is set'
);

select lives_ok(
  $$insert into public.calculation_runs (user_id, obligation_id, formula_id, formula_version, as_of, inputs_json, inputs_hash, outcome_kind, confidence, result_json, assumptions_json, calculated_at) values ('b0000000-0000-0000-0000-00000000000b', null, 'aggregates', 1, '2026-07-01', '{}', 'abc', 'result', 'high', '{}', '[]', now())$$,
  'calculation_runs: a null obligation_id (aggregate run) is unaffected by the composite FK — MATCH SIMPLE'
);

-- ─── BR-OBL-003: Murabaha assetCost + disclosedProfit = totalSalePrice (CONV-5 tolerance) ───

select throws_ok(
  $$insert into public.murabaha_details (obligation_id, user_id, asset_cost, asset_cost_prov, disclosed_profit, disclosed_profit_prov, total_sale_price, total_sale_price_prov, installment, installment_prov, term_months, term_months_prov, start_date) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 15000, '{}', 3600, '{}', 19000, '{}', 221.4286, '{}', 84, '{}', '2024-01-15')$$,
  '23514', null, 'murabaha_details: BR-OBL-003 rejects an inconsistent sale price'
);

select lives_ok(
  $$insert into public.murabaha_details (obligation_id, user_id, asset_cost, asset_cost_prov, disclosed_profit, disclosed_profit_prov, total_sale_price, total_sale_price_prov, installment, installment_prov, term_months, term_months_prov, start_date) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 15000, '{}', 3600.004, '{}', 18600, '{}', 221.4286, '{}', 84, '{}', '2024-01-15')$$,
  'murabaha_details: BR-OBL-003 accepts a difference within the CONV-5 tolerance (0.005 JOD)'
);

-- ─── INV-2: payment allocation principal + cost = amount (CONV-5 tolerance) ─────────────────

select throws_ok(
  $$insert into public.payments (obligation_id, user_id, paid_on, amount, alloc_principal, alloc_cost, alloc_source, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '2024-02-15', 307, 200, 50, 'estimated', '{}')$$,
  '23514', null, 'payments: INV-2 rejects a split that does not sum to the amount'
);

select throws_ok(
  $$insert into public.payments (obligation_id, user_id, paid_on, amount, alloc_principal, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '2024-02-15', 307, 200, '{}')$$,
  '23514', null, 'payments: rejects a partial allocation (principal without cost/source)'
);

select lives_ok(
  $$insert into public.payments (obligation_id, user_id, paid_on, amount, alloc_principal, alloc_cost, alloc_source, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '2024-02-15', 307, 257, 50, 'estimated', '{}')$$,
  'payments: INV-2 accepts an exact principal + cost = amount split'
);

-- ─── BR-OBL-002: rate_periods active-period uniqueness per (obligation_id, effective_from) ──

select lives_ok(
  $$insert into public.rate_periods (obligation_id, user_id, annual_rate, effective_from, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.075, '2024-01-15', '{}')$$,
  'rate_periods: first active period for a date is accepted'
);

select throws_ok(
  $$insert into public.rate_periods (obligation_id, user_id, annual_rate, effective_from, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.09, '2024-01-15', '{}')$$,
  '23505', null, 'rate_periods: a second active period on the same effective_from is rejected'
);

-- ─── FR-INS-004: insights dedup key (rule_id, obligation_id, trigger_hash) ──────────────────

select lives_ok(
  $$insert into public.insights (user_id, obligation_id, rule_id, severity, title_key, body_key, trigger_hash, created_at) values ('a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'test.rule', 'info', 't', 'b', 'hash-x', now())$$,
  'insights: first (rule_id, obligation_id, trigger_hash) is accepted'
);

select throws_ok(
  $$insert into public.insights (user_id, obligation_id, rule_id, severity, title_key, body_key, trigger_hash, created_at) values ('a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'test.rule', 'urgent', 't2', 'b2', 'hash-x', now())$$,
  '23505', null, 'insights: a duplicate (rule_id, obligation_id, trigger_hash) is rejected (FR-INS-004)'
);

-- ─── BR-CALC-016: card minimum_payment_rule_json type must be one of the 3 documented variants ─

select throws_ok(
  $$insert into public.card_details (obligation_id, user_id, credit_limit, credit_limit_prov, current_balance, current_balance_prov, minimum_payment_rule_json) values ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 3000, '{}', 2350, '{}', '{"type":"free"}')$$,
  '23514', null, 'card_details: rejects a minimum_payment_rule_json type outside percent/fixed/unknown'
);

select * from finish();
rollback;
