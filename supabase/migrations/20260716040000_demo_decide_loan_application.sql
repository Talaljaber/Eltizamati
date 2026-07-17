-- demo_decide_loan_application: the one transaction that approves or
-- rejects a loan application from the bank simulator dashboard. Mirrors
-- demo_publish_rate_campaign's shape (20260716000001) — SECURITY DEFINER,
-- service_role-only, allowlist revalidation is the caller's (TypeScript
-- service's) responsibility since the database has no notion of
-- DEMO_ALLOWED_USER_IDS.
--
-- On approve: computes the level-payment installment itself so the
-- resulting loan is never left inconsistent with its own principal/rate/
-- term (BR-CALC-002-style level-payment formula, mirrored here in SQL
-- since this function must be self-contained — the TypeScript service
-- pre-validates the same numbers via @eltizamati/finance-engine's
-- amortization() before calling this, and this recomputes them from the
-- authoritative approved values actually being written, not from
-- whatever the client claimed).
--
-- The resulting obligation/loan_details/rate_periods rows carry demo
-- provenance (source: 'demo', providerId: 'bank-simulator-dashboard',
-- sourceReference: the application id) — same convention as
-- demo_publish_rate_campaign — never marked as official bank data.

create or replace function public.demo_decide_loan_application(
  p_application_id uuid,
  p_decision text,
  p_approved_amount numeric(14, 3),
  p_approved_term_months integer,
  p_approved_annual_rate numeric(9, 6),
  p_decision_reason text
) returns public.loan_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.loan_applications;
  v_obligation_id uuid;
  v_monthly_rate numeric;
  v_installment numeric(14, 3);
  v_today date := current_date;
  v_maturity_date date;
begin
  if p_decision not in ('approve', 'reject') then
    raise exception 'demo_decide_loan_application: invalid decision %', p_decision using errcode = '22023';
  end if;

  select * into v_application from public.loan_applications where id = p_application_id;
  if v_application.id is null then
    raise exception 'demo_decide_loan_application: application % does not exist', p_application_id
      using errcode = '02000';
  end if;
  if v_application.status <> 'pending' then
    raise exception 'demo_decide_loan_application: application % is already decided', p_application_id
      using errcode = '22023';
  end if;

  if p_decision = 'reject' then
    if p_decision_reason is null or length(trim(p_decision_reason)) = 0 then
      raise exception 'demo_decide_loan_application: a rejection requires a reason' using errcode = '22023';
    end if;

    update public.loan_applications
    set status = 'rejected', decision_reason = p_decision_reason, decided_at = now()
    where id = p_application_id
    returning * into v_application;

    insert into public.demo_dashboard_activity (event_type, summary)
    values ('loan_application_rejected', 'Loan application rejected with a reason on file');

    return v_application;
  end if;

  -- approve
  if p_approved_amount is null or p_approved_amount <= 0
     or p_approved_term_months is null or p_approved_term_months <= 0
     or p_approved_annual_rate is null or p_approved_annual_rate < 0 then
    raise exception 'demo_decide_loan_application: approval requires a positive amount, term, and a non-negative rate'
      using errcode = '22023';
  end if;

  v_monthly_rate := p_approved_annual_rate / 12;
  v_installment := case
    when v_monthly_rate = 0 then round(p_approved_amount / p_approved_term_months, 3)
    else round(
      p_approved_amount * v_monthly_rate
        / (1 - power(1 + v_monthly_rate, -p_approved_term_months)),
      3
    )
  end;
  v_maturity_date := v_today + make_interval(months => p_approved_term_months);

  v_obligation_id := gen_random_uuid();

  insert into public.obligations
    (id, user_id, kind, nickname, institution_name, institution_id, currency,
     opened_date, provenance_json)
  values (
    v_obligation_id, v_application.user_id, 'conventionalLoan',
    format('%s loan (application)', v_application.institution_name),
    v_application.institution_name, null, 'JOD', v_today,
    jsonb_build_object(
      'source', 'demo',
      'providerId', 'bank-simulator-dashboard',
      'observedAt', now(),
      'recordedAt', now(),
      'sourceReference', p_application_id::text
    )
  );

  insert into public.loan_details
    (obligation_id, user_id, original_principal, original_principal_prov,
     installment, installment_prov, rate_type, term_months, term_months_prov,
     start_date, maturity_date, payment_frequency, purpose)
  values (
    v_obligation_id, v_application.user_id, p_approved_amount,
    jsonb_build_object(
      'source', 'demo', 'providerId', 'bank-simulator-dashboard',
      'observedAt', now(), 'recordedAt', now(), 'sourceReference', p_application_id::text
    ),
    v_installment,
    jsonb_build_object(
      'source', 'demo', 'providerId', 'bank-simulator-dashboard',
      'observedAt', now(), 'recordedAt', now(), 'sourceReference', p_application_id::text
    ),
    'fixed', p_approved_term_months,
    jsonb_build_object(
      'source', 'demo', 'providerId', 'bank-simulator-dashboard',
      'observedAt', now(), 'recordedAt', now(), 'sourceReference', p_application_id::text
    ),
    v_today, v_maturity_date, 'monthly', v_application.purpose
  );

  insert into public.rate_periods (obligation_id, user_id, annual_rate, effective_from, provenance_json)
  values (
    v_obligation_id, v_application.user_id, p_approved_annual_rate, v_today,
    jsonb_build_object(
      'source', 'demo', 'providerId', 'bank-simulator-dashboard',
      'observedAt', now(), 'recordedAt', now(), 'sourceReference', p_application_id::text
    )
  );

  update public.loan_applications
  set status = 'approved',
      approved_amount = p_approved_amount,
      approved_term_months = p_approved_term_months,
      approved_annual_rate = p_approved_annual_rate,
      resulting_obligation_id = v_obligation_id,
      decided_at = now()
  where id = p_application_id
  returning * into v_application;

  insert into public.demo_dashboard_activity (event_type, summary)
  values ('loan_application_approved', 'Loan application approved and a new obligation was created');

  return v_application;
end;
$$;

grant execute on function public.demo_decide_loan_application to service_role;

-- Extend the activity-log event_type vocabulary for the loan-application flow.
alter table public.demo_dashboard_activity drop constraint if exists demo_dashboard_activity_event_type_check;
alter table public.demo_dashboard_activity add constraint demo_dashboard_activity_event_type_check check (
  event_type in (
    'campaign_created', 'campaign_previewed', 'rate_period_appended',
    'calculation_evaluated', 'insight_generated', 'email_queued',
    'email_sent', 'email_suppressed', 'operation_failed',
    'loan_application_submitted', 'loan_application_approved', 'loan_application_rejected'
  )
);
