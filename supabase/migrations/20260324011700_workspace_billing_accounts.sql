create table if not exists public.workspace_billing_accounts (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text check (plan in ('starter', 'growth', 'custom')),
  price_id text,
  status text not null default 'not_started' check (
    status in (
      'not_started',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_workspace_billing_accounts_updated_at on public.workspace_billing_accounts;
create trigger set_workspace_billing_accounts_updated_at
before update on public.workspace_billing_accounts
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists workspace_billing_accounts_status_idx
  on public.workspace_billing_accounts (status);

create index if not exists workspace_billing_accounts_customer_idx
  on public.workspace_billing_accounts (stripe_customer_id);

create index if not exists workspace_billing_accounts_subscription_idx
  on public.workspace_billing_accounts (stripe_subscription_id);

alter table public.workspace_billing_accounts enable row level security;

drop policy if exists "Members can read workspace billing accounts" on public.workspace_billing_accounts;
create policy "Members can read workspace billing accounts"
on public.workspace_billing_accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_billing_accounts.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert workspace billing accounts" on public.workspace_billing_accounts;
create policy "Admins can insert workspace billing accounts"
on public.workspace_billing_accounts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_billing_accounts.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update workspace billing accounts" on public.workspace_billing_accounts;
create policy "Admins can update workspace billing accounts"
on public.workspace_billing_accounts
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_billing_accounts.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_billing_accounts.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
