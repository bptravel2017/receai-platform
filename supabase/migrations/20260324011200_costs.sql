create table if not exists public.cost_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, name)
);

create table if not exists public.cost_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  cost_scope text not null check (cost_scope in ('company', 'group_linked')),
  cost_date date not null,
  service_date date,
  group_name text,
  vendor_name text not null,
  description text not null,
  note text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  cost_category_id uuid references public.cost_categories(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  revenue_record_id uuid references public.revenue_records(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  revenue_record_item_id text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cost_categories_workspace_id_idx
  on public.cost_categories (workspace_id);

create index if not exists cost_records_workspace_id_idx
  on public.cost_records (workspace_id);

create index if not exists cost_records_workspace_scope_idx
  on public.cost_records (workspace_id, cost_scope);

create index if not exists cost_records_workspace_cost_date_idx
  on public.cost_records (workspace_id, cost_date desc);

create index if not exists cost_records_workspace_category_idx
  on public.cost_records (workspace_id, cost_category_id);

drop trigger if exists set_cost_categories_updated_at on public.cost_categories;
create trigger set_cost_categories_updated_at
before update on public.cost_categories
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_cost_records_updated_at on public.cost_records;
create trigger set_cost_records_updated_at
before update on public.cost_records
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.cost_categories enable row level security;
alter table public.cost_records enable row level security;

drop policy if exists "Members can read cost categories" on public.cost_categories;
create policy "Members can read cost categories"
on public.cost_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_categories.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert cost categories" on public.cost_categories;
create policy "Admins can insert cost categories"
on public.cost_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_categories.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update cost categories" on public.cost_categories;
create policy "Admins can update cost categories"
on public.cost_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_categories.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_categories.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Members can read costs" on public.cost_records;
create policy "Members can read costs"
on public.cost_records
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_records.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert costs" on public.cost_records;
create policy "Admins can insert costs"
on public.cost_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_records.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update costs" on public.cost_records;
create policy "Admins can update costs"
on public.cost_records
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_records.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_records.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
