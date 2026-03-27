alter table public.workspaces
add column if not exists plan text;

update public.workspaces
set plan = coalesce(
  plan,
  case
    when exists (
      select 1
      from public.workspace_billing_accounts billing
      where billing.workspace_id = workspaces.id
        and billing.plan = 'pro'
    ) then 'pro'
    when exists (
      select 1
      from public.workspace_billing_accounts billing
      where billing.workspace_id = workspaces.id
        and billing.plan in ('business', 'custom')
    ) then 'business'
    else 'free'
  end
);

alter table public.workspaces
alter column plan set default 'free';

update public.workspaces
set plan = 'free'
where plan is null;

alter table public.workspaces
alter column plan set not null;

alter table public.workspaces
drop constraint if exists workspaces_plan_check;

alter table public.workspaces
add constraint workspaces_plan_check
check (plan in ('free', 'pro', 'business'));

comment on column public.workspaces.plan is
  'Workspace runtime access plan. Source of truth for feature gating.';
