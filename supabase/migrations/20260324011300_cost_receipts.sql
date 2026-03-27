insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-intake',
  'receipt-intake',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
)
on conflict (id) do nothing;

create table if not exists public.cost_receipt_intakes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status text not null default 'uploaded' check (status in ('uploaded', 'parsed', 'classified', 'posted', 'failed')),
  file_path text,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint,
  temp_file_reference text,
  candidate_date date,
  candidate_vendor_name text,
  candidate_amount_cents integer,
  candidate_description text,
  candidate_note text,
  cost_scope text check (cost_scope in ('company', 'group_linked')),
  cost_category_id uuid references public.cost_categories(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  revenue_record_id uuid references public.revenue_records(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  revenue_record_item_id text,
  service_date date,
  group_name text,
  posted_cost_record_id uuid references public.cost_records(id) on delete set null,
  uploaded_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cost_receipt_intakes_file_or_reference_check
    check (file_path is not null or temp_file_reference is not null)
);

create index if not exists cost_receipt_intakes_workspace_id_idx
  on public.cost_receipt_intakes (workspace_id);

create index if not exists cost_receipt_intakes_workspace_status_idx
  on public.cost_receipt_intakes (workspace_id, status);

create index if not exists cost_receipt_intakes_workspace_created_at_idx
  on public.cost_receipt_intakes (workspace_id, created_at desc);

drop trigger if exists set_cost_receipt_intakes_updated_at on public.cost_receipt_intakes;
create trigger set_cost_receipt_intakes_updated_at
before update on public.cost_receipt_intakes
for each row execute procedure public.set_current_timestamp_updated_at();

alter table public.cost_receipt_intakes enable row level security;

drop policy if exists "Members can read cost receipt intakes" on public.cost_receipt_intakes;
create policy "Members can read cost receipt intakes"
on public.cost_receipt_intakes
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_receipt_intakes.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert cost receipt intakes" on public.cost_receipt_intakes;
create policy "Admins can insert cost receipt intakes"
on public.cost_receipt_intakes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_receipt_intakes.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update cost receipt intakes" on public.cost_receipt_intakes;
create policy "Admins can update cost receipt intakes"
on public.cost_receipt_intakes
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_receipt_intakes.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = cost_receipt_intakes.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
