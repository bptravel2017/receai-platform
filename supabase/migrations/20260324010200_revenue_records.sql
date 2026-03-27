create table if not exists public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  group_name text,
  service_date date not null,
  status text not null check (status in ('draft', 'open')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  notes text,
  line_items jsonb not null default '[]'::jsonb,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_records_workspace_id_idx
  on public.revenue_records (workspace_id);

create index if not exists revenue_records_workspace_service_date_idx
  on public.revenue_records (workspace_id, service_date desc);

create index if not exists revenue_records_workspace_customer_id_idx
  on public.revenue_records (workspace_id, customer_id);

create index if not exists revenue_records_workspace_status_idx
  on public.revenue_records (workspace_id, status);

drop trigger if exists set_revenue_records_updated_at on public.revenue_records;
create trigger set_revenue_records_updated_at
before update on public.revenue_records
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.revenue_records enable row level security;

drop policy if exists "Members can read revenue records" on public.revenue_records;
create policy "Members can read revenue records"
on public.revenue_records
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = revenue_records.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert revenue records" on public.revenue_records;
create policy "Admins can insert revenue records"
on public.revenue_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = revenue_records.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update revenue records" on public.revenue_records;
create policy "Admins can update revenue records"
on public.revenue_records
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = revenue_records.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = revenue_records.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
