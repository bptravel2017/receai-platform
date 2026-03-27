update public.workspace_billing_accounts
set plan = case
  when plan = 'starter' then 'pro'
  when plan = 'growth' then 'business'
  else plan
end;

alter table public.workspace_billing_accounts
drop constraint if exists workspace_billing_accounts_plan_check;

alter table public.workspace_billing_accounts
add constraint workspace_billing_accounts_plan_check
check (plan in ('pro', 'business', 'custom'));
