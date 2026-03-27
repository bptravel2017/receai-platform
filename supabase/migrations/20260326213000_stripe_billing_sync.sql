alter table public.workspace_billing_accounts
add column if not exists current_period_start timestamptz;

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  plan text check (plan in ('pro', 'business', 'custom')),
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
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workspace_subscriptions_workspace_id_idx
  on public.workspace_subscriptions (workspace_id);

create index if not exists workspace_subscriptions_customer_id_idx
  on public.workspace_subscriptions (stripe_customer_id);

drop trigger if exists set_workspace_subscriptions_updated_at on public.workspace_subscriptions;
create trigger set_workspace_subscriptions_updated_at
before update on public.workspace_subscriptions
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.workspace_subscriptions enable row level security;

drop policy if exists "Members can read workspace subscriptions" on public.workspace_subscriptions;
create policy "Members can read workspace subscriptions"
on public.workspace_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_subscriptions.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert workspace subscriptions" on public.workspace_subscriptions;
create policy "Admins can insert workspace subscriptions"
on public.workspace_subscriptions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_subscriptions.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update workspace subscriptions" on public.workspace_subscriptions;
create policy "Admins can update workspace subscriptions"
on public.workspace_subscriptions
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_subscriptions.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_subscriptions.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_event_id text,
  stripe_event_type text,
  event_type text not null check (
    event_type in ('upgrade', 'downgrade', 'renewal', 'payment_failed', 'cancellation')
  ),
  plan text,
  status text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_events_workspace_id_idx
  on public.billing_events (workspace_id, created_at desc);

create index if not exists billing_events_subscription_id_idx
  on public.billing_events (stripe_subscription_id);

alter table public.billing_events enable row level security;

drop policy if exists "Members can read billing events" on public.billing_events;
create policy "Members can read billing events"
on public.billing_events
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = billing_events.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert billing events" on public.billing_events;
create policy "Admins can insert billing events"
on public.billing_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = billing_events.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

insert into public.workspace_subscriptions (
  workspace_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  plan,
  status,
  current_period_start,
  current_period_end
)
select
  workspace_id,
  stripe_customer_id,
  stripe_subscription_id,
  price_id,
  plan,
  status,
  current_period_start,
  current_period_end
from public.workspace_billing_accounts
where stripe_subscription_id is not null
on conflict (stripe_subscription_id) do update
set
  workspace_id = excluded.workspace_id,
  stripe_customer_id = excluded.stripe_customer_id,
  stripe_price_id = excluded.stripe_price_id,
  plan = excluded.plan,
  status = excluded.status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end;
