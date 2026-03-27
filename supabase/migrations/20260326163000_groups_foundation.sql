create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  notes_internal text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists groups_workspace_name_unique_idx
  on public.groups (workspace_id, lower(name));

create index if not exists groups_workspace_status_idx
  on public.groups (workspace_id, status);

create index if not exists groups_workspace_customer_idx
  on public.groups (workspace_id, customer_id);

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
before update on public.groups
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.groups enable row level security;

drop policy if exists "Members can read groups" on public.groups;
create policy "Members can read groups"
on public.groups
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = groups.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert groups" on public.groups;
create policy "Admins can insert groups"
on public.groups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = groups.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update groups" on public.groups;
create policy "Admins can update groups"
on public.groups
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = groups.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = groups.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

alter table public.revenue_records
  add column if not exists group_id uuid references public.groups(id) on delete set null;

alter table public.invoices
  add column if not exists group_id uuid references public.groups(id) on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'costs'
      and column_name = 'group_id'
      and data_type <> 'uuid'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'costs'
      and column_name = 'legacy_group_key'
  ) then
    alter table public.costs rename column group_id to legacy_group_key;
  end if;
end $$;

alter table public.costs
  add column if not exists group_id uuid references public.groups(id) on delete set null;

comment on column public.revenue_records.group_name is 'Deprecated display-only field. group_id is the source of truth.';
comment on column public.invoices.group_name is 'Deprecated display-only field. group_id is the source of truth.';

drop index if exists costs_workspace_group_idx;

alter table public.costs
  drop constraint if exists costs_type_linkage_check;

create index if not exists revenue_records_workspace_group_id_idx
  on public.revenue_records (workspace_id, group_id);

create index if not exists invoices_workspace_group_id_idx
  on public.invoices (workspace_id, group_id);

create index if not exists costs_workspace_group_id_idx
  on public.costs (workspace_id, group_id);

with source_names as (
  select revenue.workspace_id, nullif(trim(revenue.group_name), '') as group_name
  from public.revenue_records revenue
  union
  select invoice.workspace_id, nullif(trim(invoice.group_name), '') as group_name
  from public.invoices invoice
  union
  select cost.workspace_id, nullif(trim(cost.legacy_group_key), '') as group_name
  from public.costs cost
), distinct_names as (
  select workspace_id, group_name
  from source_names
  where group_name is not null
), customer_matches as (
  select
    value.workspace_id,
    value.group_name,
    case
      when count(distinct value.customer_id) = 1 then min(value.customer_id::text)::uuid
      else null
    end as customer_id
  from (
    select revenue.workspace_id, nullif(trim(revenue.group_name), '') as group_name, revenue.customer_id
    from public.revenue_records revenue
    union all
    select invoice.workspace_id, nullif(trim(invoice.group_name), '') as group_name, invoice.customer_id
    from public.invoices invoice
  ) value
  where value.group_name is not null
  group by value.workspace_id, value.group_name
)
insert into public.groups (
  workspace_id,
  name,
  customer_id,
  status,
  notes_internal
)
select
  distinct_names.workspace_id,
  distinct_names.group_name,
  customer_matches.customer_id,
  'active',
  null
from distinct_names
left join customer_matches
  on customer_matches.workspace_id = distinct_names.workspace_id
 and customer_matches.group_name = distinct_names.group_name
where not exists (
  select 1
  from public.groups existing
  where existing.workspace_id = distinct_names.workspace_id
    and lower(existing.name) = lower(distinct_names.group_name)
);

update public.revenue_records revenue
set group_id = groups.id
from public.groups
where revenue.workspace_id = groups.workspace_id
  and nullif(trim(revenue.group_name), '') = groups.name
  and revenue.group_id is null;

update public.invoices invoice
set group_id = coalesce(
  invoice.group_id,
  revenue.group_id,
  (
    select matched_group.id
    from public.groups matched_group
    where matched_group.workspace_id = invoice.workspace_id
      and nullif(trim(invoice.group_name), '') = matched_group.name
    limit 1
  )
)
from public.revenue_records revenue
where invoice.revenue_record_id = revenue.id
  and invoice.workspace_id = revenue.workspace_id;

update public.invoices invoice
set group_id = groups.id
from public.groups
where invoice.workspace_id = groups.workspace_id
  and nullif(trim(invoice.group_name), '') = groups.name
  and invoice.group_id is null;

update public.costs cost
set group_id = groups.id
from public.groups
where cost.workspace_id = groups.workspace_id
  and nullif(trim(cost.legacy_group_key), '') = groups.name
  and cost.group_id is null;

update public.revenue_records revenue
set group_name = groups.name
from public.groups
where revenue.group_id = groups.id
  and revenue.workspace_id = groups.workspace_id;

update public.invoices invoice
set group_name = groups.name
from public.groups
where invoice.group_id = groups.id
  and invoice.workspace_id = groups.workspace_id;

alter table public.costs
  add constraint costs_type_linkage_check check (
    (cost_type = 'revenue' and revenue_id is not null)
    or (cost_type = 'customer' and customer_id is not null)
    or (cost_type = 'group' and group_id is not null)
    or (cost_type = 'overhead' and revenue_id is null and customer_id is null and group_id is null)
  );

create or replace function public.create_invoice_from_daytime_entries(
  p_workspace_id uuid,
  p_entry_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry_count integer;
  v_customer_count integer;
  v_group_count integer;
  v_invoice_id uuid;
  v_customer_id uuid;
  v_group_id uuid;
  v_group_customer_id uuid;
  v_anchor_revenue_id uuid;
  v_total_amount integer;
  v_line_items jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_entry_ids is null or array_length(p_entry_ids, 1) is null then
    raise exception 'Choose at least one Daytime entry.';
  end if;

  if not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = p_workspace_id
      and membership.user_id = v_user_id
      and membership.role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can create invoices from Daytime entries.';
  end if;

  with locked_entries as (
    select revenue.*
    from public.revenue_records revenue
    where revenue.workspace_id = p_workspace_id
      and revenue.id = any (p_entry_ids)
    for update
  )
  select count(*)
  into v_entry_count
  from locked_entries;

  if v_entry_count <> array_length(p_entry_ids, 1) then
    raise exception 'One or more selected Daytime entries could not be found.';
  end if;

  if exists (
    select 1
    from public.revenue_records revenue
    where revenue.workspace_id = p_workspace_id
      and revenue.id = any (p_entry_ids)
      and revenue.billing_state <> 'unbilled'
  ) then
    raise exception 'Only unbilled Daytime entries can be invoiced.';
  end if;

  if exists (
    select 1
    from public.revenue_records revenue
    where revenue.workspace_id = p_workspace_id
      and revenue.id = any (p_entry_ids)
      and revenue.invoice_id is not null
  ) then
    raise exception 'One or more selected Daytime entries are already linked to an invoice.';
  end if;

  select
    count(distinct revenue.customer_id),
    count(distinct revenue.group_id)
      filter (where revenue.group_id is not null)
  into
    v_customer_count,
    v_group_count
  from public.revenue_records revenue
  where revenue.workspace_id = p_workspace_id
    and revenue.id = any (p_entry_ids);

  if v_customer_count > 1 and v_group_count <> 1 then
    raise exception 'Selected entries must belong to the same customer or group';
  end if;

  select
    min(revenue.customer_id),
    min(revenue.group_id),
    min(revenue.id),
    sum(revenue.amount_cents),
    jsonb_agg(
      jsonb_build_object(
        'id', revenue.id::text,
        'title', coalesce(nullif(trim(coalesce(revenue.line_items -> 0 ->> 'title', '')), ''), initcap(revenue.entry_type)),
        'description', null,
        'quantity', coalesce(nullif(revenue.line_items -> 0 ->> 'quantity', '')::numeric, 1),
        'unitPriceCents', coalesce(
          nullif(revenue.line_items -> 0 ->> 'unitPriceCents', '')::integer,
          revenue.amount_cents
        ),
        'amountCents', revenue.amount_cents,
        'serviceDate', revenue.service_date::text
      )
      order by revenue.service_date asc, revenue.created_at asc
    )
  into
    v_customer_id,
    v_group_id,
    v_anchor_revenue_id,
    v_total_amount,
    v_line_items
  from public.revenue_records revenue
  where revenue.workspace_id = p_workspace_id
    and revenue.id = any (p_entry_ids);

  if v_group_id is not null then
    select groups.customer_id
    into v_group_customer_id
    from public.groups
    where groups.id = v_group_id
      and groups.workspace_id = p_workspace_id;

    if v_group_customer_id is not null then
      v_customer_id := v_group_customer_id;
    end if;
  end if;

  insert into public.invoices (
    workspace_id,
    revenue_record_id,
    customer_id,
    group_id,
    invoice_date,
    due_date,
    status,
    amount_cents,
    currency,
    notes,
    line_items,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_workspace_id,
    v_anchor_revenue_id,
    v_customer_id,
    v_group_id,
    current_date,
    current_date + 14,
    'draft',
    coalesce(v_total_amount, 0),
    'USD',
    null,
    coalesce(v_line_items, '[]'::jsonb),
    v_user_id,
    v_user_id
  )
  returning id into v_invoice_id;

  update public.revenue_records
  set
    billing_state = 'billed',
    invoice_id = v_invoice_id,
    updated_by_user_id = v_user_id
  where workspace_id = p_workspace_id
    and id = any (p_entry_ids);

  return v_invoice_id;
end;
$$;
