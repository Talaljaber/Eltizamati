-- Personal vs official obligations (packages/domain/src/entities/obligation.ts
-- ObligationConnectionType). A `personal` loan is entered and tracked by the
-- customer alone — the bank never sees it and never writes to it. An
-- `official` loan is bank-connected — only the bank (service_role) may log
-- payments or decide its schedule proposals; the customer is read-only there.
--
-- Existing rows default to 'official': every obligation seeded before this
-- migration came from the bank-connected demo/dashboard flows.

alter table public.obligations
  add column connection_type text not null default 'official'
  check (connection_type in ('personal', 'official'));

comment on column public.obligations.connection_type is
  'personal: customer-only, invisible to the bank. official: bank-connected, '
  'only the bank may log payments or decide schedule proposals.';

-- ─── Payment write authority ───────────────────────────────────────────────
-- Mirrors enforce_rate_period_authority (20260718025215): UI restrictions
-- alone are not sufficient, old or malicious mobile clients must be rejected
-- by Postgres too. RLS alone can't express "the bank inserted this row" vs
-- "the customer inserted this row" for the same user_id, since a bank-logged
-- payment on an official loan still carries the customer's user_id (the
-- payments_obligation_owner_fkey requires it) — only a trigger keyed on the
-- obligation's connection_type can draw that line, for insert/update/delete.

create or replace function public.enforce_payment_authority()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_obligation_id uuid := coalesce(new.obligation_id, old.obligation_id);
  v_connection_type text;
begin
  if current_user in ('postgres', 'service_role') then
    return coalesce(new, old);
  end if;

  select connection_type into v_connection_type
  from public.obligations
  where id = v_obligation_id;

  if v_connection_type = 'official' then
    raise exception 'official loans only accept payments recorded by the bank'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.enforce_payment_authority() from public;

drop trigger if exists payments_authority_guard on public.payments;
create trigger payments_authority_guard
before insert or update or delete on public.payments
for each row execute function public.enforce_payment_authority();

-- ─── Bank-side payment recording ───────────────────────────────────────────
-- The bank dashboard's counterpart to the customer's ObligationService.logPayment
-- (apps/mobile/src/services/obligation-service.ts) — the only way a payment is
-- written for an official loan.

create or replace function public.record_bank_payment(
  p_obligation_id uuid,
  p_amount numeric,
  p_paid_on date
) returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligation public.obligations;
  v_payment public.payments;
  v_now timestamptz := now();
begin
  select * into v_obligation from public.obligations where id = p_obligation_id;
  if v_obligation.id is null then
    raise exception 'record_bank_payment: obligation % does not exist', p_obligation_id
      using errcode = '02000';
  end if;
  if v_obligation.connection_type <> 'official' then
    raise exception 'record_bank_payment: obligation % is not an official (bank-connected) loan',
      p_obligation_id using errcode = '22023';
  end if;
  if p_amount <= 0 then
    raise exception 'record_bank_payment: amount must be positive' using errcode = '22023';
  end if;

  insert into public.payments (obligation_id, user_id, paid_on, amount, provenance_json)
  values (
    p_obligation_id, v_obligation.user_id, p_paid_on, p_amount,
    jsonb_build_object(
      'source', 'official', 'providerId', 'bank-simulator-dashboard',
      'observedAt', v_now, 'recordedAt', v_now
    )
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

revoke all on function public.record_bank_payment(uuid, numeric, date)
  from public, anon, authenticated;
grant execute on function public.record_bank_payment(uuid, numeric, date) to service_role;

-- ─── Schedule proposal decisions: shared logic, two callers ────────────────
-- Extracted from demo_decide_schedule_proposal (20260718084829) unchanged,
-- parameterized by who decided, so a personal loan's customer can now approve
-- their own proposal through the same mechanics the bank uses for official
-- loans (installment/balloon are still only ever mutated here, never by the
-- client directly).

create or replace function public.apply_schedule_proposal_decision(
  p_proposal_id uuid,
  p_decision text,
  p_reason text,
  p_decided_by text
) returns public.loan_schedule_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.loan_schedule_proposals;
  v_now timestamptz := now();
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(trim(p_reason), '') is null then
    raise exception 'rejection reason is required' using errcode = '22023';
  end if;

  select * into v_proposal
  from public.loan_schedule_proposals
  where id = p_proposal_id
  for update;
  if v_proposal.id is null then
    raise exception 'schedule proposal does not exist' using errcode = '02000';
  end if;
  if v_proposal.status <> 'pending' then
    raise exception 'schedule proposal has already been decided' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.obligations o
    join public.loan_details l on l.obligation_id = o.id and l.user_id = o.user_id
    where o.id = v_proposal.obligation_id and o.user_id = v_proposal.user_id
      and o.kind = 'conventionalLoan' and o.closed_date is null
  ) then
    raise exception 'the proposal loan is unavailable or closed' using errcode = '22023';
  end if;

  if p_decision = 'approved' then
    update public.loan_schedule_proposals
    set status = 'superseded', decided_at = v_now, updated_at = v_now
    where obligation_id = v_proposal.obligation_id and status = 'approved';

    update public.loan_schedule_proposals
    set status = 'approved', decision_reason = null, decided_at = v_now, updated_at = v_now
    where id = p_proposal_id
    returning * into v_proposal;

    update public.loan_details
    set installment = v_proposal.proposed_installment,
        installment_prov = jsonb_build_object(
          'source', case when p_decided_by = 'self' then 'userEntered' else 'demo' end,
          'providerId', p_decided_by,
          'sourceReference', v_proposal.id::text,
          'observedAt', v_now, 'recordedAt', v_now
        ),
        contractual_balloon = nullif(v_proposal.final_balloon, 0),
        contractual_balloon_prov = case when v_proposal.final_balloon > 0 then
          jsonb_build_object(
            'source', case when p_decided_by = 'self' then 'userEntered' else 'demo' end,
            'providerId', p_decided_by,
            'sourceReference', v_proposal.id::text,
            'observedAt', v_now, 'recordedAt', v_now
          ) else null end
    where obligation_id = v_proposal.obligation_id and user_id = v_proposal.user_id;
  else
    update public.loan_schedule_proposals
    set status = 'rejected', decision_reason = trim(p_reason),
        decided_at = v_now, updated_at = v_now
    where id = p_proposal_id
    returning * into v_proposal;
  end if;

  insert into public.insights (
    user_id, obligation_id, rule_id, severity, title_key, body_key,
    params_json, trigger_hash, deep_link
  ) values (
    v_proposal.user_id,
    v_proposal.obligation_id,
    case when p_decision = 'approved' then 'SCHEDULE_PROPOSAL_APPROVED'
         else 'SCHEDULE_PROPOSAL_REJECTED' end,
    case when p_decision = 'approved' then 'positive' else 'attention' end,
    case when p_decision = 'approved' then 'insights.scheduleProposalApproved.title'
         else 'insights.scheduleProposalRejected.title' end,
    case when p_decision = 'approved' then 'insights.scheduleProposalApproved.body'
         else 'insights.scheduleProposalRejected.body' end,
    jsonb_build_object(
      'proposalId', v_proposal.id::text,
      'reason', coalesce(v_proposal.decision_reason, '')
    ),
    v_proposal.id::text || ':' || p_decision,
    '/obligation/' || v_proposal.obligation_id::text || '/schedule'
  );

  return v_proposal;
end;
$$;

revoke all on function public.apply_schedule_proposal_decision(uuid, text, text, text)
  from public, anon, authenticated;

-- Bank-side decision — now restricted to official loans only (a personal
-- loan's bank has no visibility into it at all, so it can't decide for it).
create or replace function public.demo_decide_schedule_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_reason text default null
) returns public.loan_schedule_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection_type text;
begin
  select o.connection_type into v_connection_type
  from public.loan_schedule_proposals p
  join public.obligations o on o.id = p.obligation_id
  where p.id = p_proposal_id;

  if v_connection_type is distinct from 'official' then
    raise exception 'the bank may only decide schedule proposals for official (bank-connected) loans'
      using errcode = '22023';
  end if;

  return public.apply_schedule_proposal_decision(
    p_proposal_id, p_decision, p_reason, 'bank-simulator-dashboard'
  );
end;
$$;

revoke all on function public.demo_decide_schedule_proposal(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.demo_decide_schedule_proposal(uuid, text, text)
  to service_role;

-- Customer self-approval — personal loans only, and only the proposal's own
-- owner. There is no self-reject: the customer simply doesn't submit a
-- proposal they don't want (the pre-submission "Reject" button never
-- persists anything — see app/obligation/[id]/schedule-proposal.tsx).
create or replace function public.self_decide_schedule_proposal(
  p_proposal_id uuid
) returns public.loan_schedule_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.loan_schedule_proposals;
  v_connection_type text;
begin
  if (select auth.uid()) is null then
    raise exception 'self-approval requires an authenticated customer' using errcode = '42501';
  end if;

  select * into v_proposal from public.loan_schedule_proposals where id = p_proposal_id;
  if v_proposal.id is null then
    raise exception 'schedule proposal does not exist' using errcode = '02000';
  end if;
  if v_proposal.user_id <> (select auth.uid()) then
    raise exception 'customers may only approve their own schedule proposal'
      using errcode = '42501';
  end if;

  select connection_type into v_connection_type
  from public.obligations where id = v_proposal.obligation_id;
  if v_connection_type is distinct from 'personal' then
    raise exception 'self-approval is only available for personal (non-bank-connected) loans'
      using errcode = '22023';
  end if;

  return public.apply_schedule_proposal_decision(p_proposal_id, 'approved', null, 'self');
end;
$$;

revoke all on function public.self_decide_schedule_proposal(uuid) from public, anon;
grant execute on function public.self_decide_schedule_proposal(uuid) to authenticated;
