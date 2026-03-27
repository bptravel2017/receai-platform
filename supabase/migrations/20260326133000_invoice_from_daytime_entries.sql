alter table public.revenue_records
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists revenue_records_workspace_invoice_id_idx
  on public.revenue_records (workspace_id, invoice_id);

update public.revenue_records revenue
set invoice_id = invoice.id
from public.invoices invoice
where invoice.revenue_record_id = revenue.id
  and revenue.invoice_id is null;

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
  v_group_name text;
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
    count(distinct nullif(trim(coalesce(revenue.group_name, '')), ''))
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
    min(nullif(trim(coalesce(revenue.group_name, '')), '')),
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
    v_group_name,
    v_anchor_revenue_id,
    v_total_amount,
    v_line_items
  from public.revenue_records revenue
  where revenue.workspace_id = p_workspace_id
    and revenue.id = any (p_entry_ids);

  insert into public.invoices (
    workspace_id,
    revenue_record_id,
    customer_id,
    group_name,
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
    v_group_name,
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

grant execute on function public.create_invoice_from_daytime_entries(uuid, uuid[]) to authenticated;
