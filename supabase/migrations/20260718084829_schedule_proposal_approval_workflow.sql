create table public.loan_schedule_proposals (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null,
  user_id uuid not null,
  proposal_kind text not null check (proposal_kind in ('recommended', 'custom')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'superseded')),
  currency text not null,
  as_of date not null,
  proposed_installment numeric(14, 3) not null check (proposed_installment > 0),
  projected_remaining_payable numeric(14, 3) not null
    check (projected_remaining_payable >= 0),
  final_balloon numeric(14, 3) not null default 0 check (final_balloon >= 0),
  rate_history_snapshot jsonb not null check (jsonb_typeof(rate_history_snapshot) = 'array'),
  schedule_snapshot jsonb not null check (
    jsonb_typeof(schedule_snapshot) = 'array' and jsonb_array_length(schedule_snapshot) > 0
  ),
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loan_schedule_proposals_obligation_owner_fkey
    foreign key (obligation_id, user_id)
    references public.obligations (id, user_id) on delete cascade,
  constraint loan_schedule_proposals_decision_shape_check check (
    (status = 'pending' and decided_at is null and decision_reason is null)
    or (status in ('approved', 'superseded') and decided_at is not null)
    or (status = 'rejected' and decided_at is not null and decision_reason is not null)
  )
);

create unique index loan_schedule_proposals_one_pending_idx
  on public.loan_schedule_proposals (obligation_id)
  where status = 'pending';
create unique index loan_schedule_proposals_one_approved_idx
  on public.loan_schedule_proposals (obligation_id)
  where status = 'approved';
create index loan_schedule_proposals_user_created_idx
  on public.loan_schedule_proposals (user_id, created_at desc);
create index loan_schedule_proposals_obligation_created_idx
  on public.loan_schedule_proposals (obligation_id, created_at desc);

alter table public.loan_schedule_proposals enable row level security;

create policy loan_schedule_proposals_select_own
  on public.loan_schedule_proposals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy loan_schedule_proposals_insert_own
  on public.loan_schedule_proposals for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

grant select on public.loan_schedule_proposals to authenticated;
grant insert (
  id, obligation_id, user_id, proposal_kind, currency, as_of,
  proposed_installment, projected_remaining_payable, final_balloon,
  rate_history_snapshot, schedule_snapshot
) on public.loan_schedule_proposals to authenticated;
grant select, insert, update, delete on public.loan_schedule_proposals to service_role;

create or replace function public.enforce_schedule_proposal_submission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role') then return new; end if;
  if (select auth.uid()) is null or new.user_id <> (select auth.uid()) then
    raise exception 'schedule proposal must belong to the authenticated customer'
      using errcode = '42501';
  end if;
  if new.status <> 'pending' or new.decided_at is not null or new.decision_reason is not null then
    raise exception 'customers may only submit pending schedule proposals'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.obligations o
    join public.loan_details l on l.obligation_id = o.id and l.user_id = o.user_id
    where o.id = new.obligation_id and o.user_id = new.user_id
      and o.kind = 'conventionalLoan' and o.closed_date is null
  ) then
    raise exception 'schedule proposals require an open conventional loan'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_schedule_proposal_submission() from public;
create trigger loan_schedule_proposals_submission_guard
before insert on public.loan_schedule_proposals
for each row execute function public.enforce_schedule_proposal_submission();

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
          'source', 'demo', 'providerId', 'bank-simulator-dashboard',
          'sourceReference', v_proposal.id::text,
          'observedAt', v_now, 'recordedAt', v_now
        ),
        contractual_balloon = nullif(v_proposal.final_balloon, 0),
        contractual_balloon_prov = case when v_proposal.final_balloon > 0 then
          jsonb_build_object(
            'source', 'demo', 'providerId', 'bank-simulator-dashboard',
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

revoke all on function public.demo_decide_schedule_proposal(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.demo_decide_schedule_proposal(uuid, text, text)
  to service_role;
