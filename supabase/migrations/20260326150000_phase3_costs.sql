create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  cost_date date not null,
  cost_type text not null check (cost_type in ('revenue', 'customer', 'group', 'overhead')),
  revenue_id uuid references public.revenue_records(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  group_id text,
  vendor_id uuid references public.fulfillment_parties(id) on delete set null,
  driver_id uuid references public.fulfillment_parties(id) on delete set null,
  guide_id uuid references public.fulfillment_parties(id) on delete set null,
  cost_name text not null,
  description text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  notes_internal text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint costs_type_linkage_check check (
    (cost_type = 'revenue' and revenue_id is not null)
    or (cost_type = 'customer' and customer_id is not null)
    or (cost_type = 'group' and group_id is not null)
    or (cost_type = 'overhead' and revenue_id is null and customer_id is null and group_id is null)
  )
);

create index if not exists costs_workspace_cost_date_idx
  on public.costs (workspace_id, cost_date desc);

create index if not exists costs_workspace_type_idx
  on public.costs (workspace_id, cost_type);

create index if not exists costs_workspace_revenue_idx
  on public.costs (workspace_id, revenue_id);

create index if not exists costs_workspace_customer_idx
  on public.costs (workspace_id, customer_id);

create index if not exists costs_workspace_group_idx
  on public.costs (workspace_id, group_id);

create index if not exists costs_workspace_vendor_idx
  on public.costs (workspace_id, vendor_id);

create index if not exists costs_workspace_driver_idx
  on public.costs (workspace_id, driver_id);

create index if not exists costs_workspace_guide_idx
  on public.costs (workspace_id, guide_id);

create index if not exists costs_workspace_payment_status_idx
  on public.costs (workspace_id, payment_status);

drop trigger if exists set_costs_updated_at on public.costs;
create trigger set_costs_updated_at
before update on public.costs
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.costs enable row level security;

drop policy if exists "Members can read costs v3" on public.costs;
create policy "Members can read costs v3"
on public.costs
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = costs.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert costs v3" on public.costs;
create policy "Admins can insert costs v3"
on public.costs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = costs.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update costs v3" on public.costs;
create policy "Admins can update costs v3"
on public.costs
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = costs.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = costs.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
