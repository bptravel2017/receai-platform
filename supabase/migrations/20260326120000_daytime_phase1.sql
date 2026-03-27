create table if not exists public.fulfillment_parties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  party_type text not null check (party_type in ('driver', 'vendor', 'guide', 'operator')),
  display_name text not null,
  is_active boolean not null default true,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists fulfillment_parties_workspace_id_idx
  on public.fulfillment_parties (workspace_id);

create index if not exists fulfillment_parties_workspace_type_active_idx
  on public.fulfillment_parties (workspace_id, party_type, is_active);

drop trigger if exists set_fulfillment_parties_updated_at on public.fulfillment_parties;
create trigger set_fulfillment_parties_updated_at
before update on public.fulfillment_parties
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.fulfillment_parties enable row level security;

drop policy if exists "Members can read fulfillment parties" on public.fulfillment_parties;
create policy "Members can read fulfillment parties"
on public.fulfillment_parties
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = fulfillment_parties.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert fulfillment parties" on public.fulfillment_parties;
create policy "Admins can insert fulfillment parties"
on public.fulfillment_parties
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = fulfillment_parties.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update fulfillment parties" on public.fulfillment_parties;
create policy "Admins can update fulfillment parties"
on public.fulfillment_parties
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = fulfillment_parties.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = fulfillment_parties.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

alter table public.revenue_records
  add column if not exists entry_type text not null default 'daytime'
    check (entry_type in ('daytime', 'transfer', 'custom')),
  add column if not exists fulfillment_party_type text
    check (fulfillment_party_type in ('driver', 'vendor', 'guide', 'operator')),
  add column if not exists fulfillment_party_id uuid,
  add column if not exists billing_state text not null default 'unbilled'
    check (billing_state in ('not_needed', 'unbilled', 'billed'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'revenue_records_fulfillment_party_id_fkey'
  ) then
    alter table public.revenue_records
      add constraint revenue_records_fulfillment_party_id_fkey
      foreign key (fulfillment_party_id)
      references public.fulfillment_parties(id)
      on delete set null;
  end if;
end $$;

create index if not exists revenue_records_workspace_billing_state_idx
  on public.revenue_records (workspace_id, billing_state);

create index if not exists revenue_records_workspace_entry_type_idx
  on public.revenue_records (workspace_id, entry_type);

create index if not exists revenue_records_workspace_fulfillment_party_idx
  on public.revenue_records (workspace_id, fulfillment_party_id);

update public.revenue_records revenue
set
  entry_type = coalesce(revenue.entry_type, 'daytime'),
  fulfillment_party_type = null,
  fulfillment_party_id = null,
  billing_state = case
    when exists (
      select 1
      from public.invoices invoice
      where invoice.revenue_record_id = revenue.id
    ) then 'billed'
    else 'unbilled'
  end;
