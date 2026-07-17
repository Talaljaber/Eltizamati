-- Fix: demo_decide_loan_application (20260716040000) never wrote
-- loan_details.outstanding_balance for the obligation it creates on
-- approval. That left every dashboard-approved loan with no balance to
-- display, and — since BR-STAT-001's onTrack/unknown split for a brand-new
-- loan is separately fixed in the domain layer — no on-file balance to
-- treat as "day one" for any future manual balance updates either.
--
-- A freshly disbursed loan's outstanding balance on day one is exactly its
-- approved principal (nothing has been repaid yet), so this both corrects
-- the function going forward and backfills the obligations already created
-- by it before this fix.

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
  v_principal_prov jsonb;
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

  v_principal_prov := jsonb_build_object(
    'source', 'demo', 'providerId', 'bank-simulator-dashboard',
    'observedAt', now(), 'recordedAt', now(), 'sourceReference', p_application_id::text
  );

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
     outstanding_balance, outstanding_balance_prov,
     installment, installment_prov, rate_type, term_months, term_months_prov,
     start_date, maturity_date, payment_frequency, purpose)
  values (
    v_obligation_id, v_application.user_id, p_approved_amount, v_principal_prov,
    -- Day-one balance: nothing has been repaid yet, so it equals the
    -- approved principal exactly.
    p_approved_amount, v_principal_prov,
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

-- Backfill: obligations already created by the pre-fix version of this
-- function have no outstanding_balance on file. Only touches rows this
-- function itself created (matched via loan_applications.resulting_obligation_id)
-- and only where the balance is still unset, so it can't clobber a balance
-- a client has since entered manually.
update public.loan_details ld
set outstanding_balance = ld.original_principal,
    outstanding_balance_prov = ld.original_principal_prov
from public.loan_applications la
where la.resulting_obligation_id = ld.obligation_id
  and la.status = 'approved'
  and ld.outstanding_balance is null;
