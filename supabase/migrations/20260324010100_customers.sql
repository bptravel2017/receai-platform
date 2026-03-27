create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  notes text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_workspace_id_idx
  on public.customers (workspace_id);

create index if not exists customers_workspace_name_idx
  on public.customers (workspace_id, name);

create index if not exists customers_workspace_email_idx
  on public.customers (workspace_id, lower(email));

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.customers enable row level security;

drop policy if exists "Members can read customers" on public.customers;
create policy "Members can read customers"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = customers.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert customers" on public.customers;
create policy "Admins can insert customers"
on public.customers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = customers.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update customers" on public.customers;
create policy "Admins can update customers"
on public.customers
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = customers.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = customers.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
