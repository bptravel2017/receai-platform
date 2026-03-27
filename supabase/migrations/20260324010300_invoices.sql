create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  revenue_record_id uuid not null references public.revenue_records(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  group_name text,
  invoice_date date not null,
  due_date date,
  status text not null check (status in ('draft', 'open')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  notes text,
  line_items jsonb not null default '[]'::jsonb,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (revenue_record_id)
);

create index if not exists invoices_workspace_id_idx
  on public.invoices (workspace_id);

create index if not exists invoices_workspace_customer_id_idx
  on public.invoices (workspace_id, customer_id);

create index if not exists invoices_workspace_status_idx
  on public.invoices (workspace_id, status);

create index if not exists invoices_workspace_invoice_date_idx
  on public.invoices (workspace_id, invoice_date desc);

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.invoices enable row level security;

drop policy if exists "Members can read invoices" on public.invoices;
create policy "Members can read invoices"
on public.invoices
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoices.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert invoices" on public.invoices;
create policy "Admins can insert invoices"
on public.invoices
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoices.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update invoices" on public.invoices;
create policy "Admins can update invoices"
on public.invoices
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoices.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoices.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
