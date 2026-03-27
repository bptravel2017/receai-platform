update public.invoices
set status = 'finalized'
where status = 'open';

alter table public.invoices
  drop constraint if exists invoices_status_check;

alter table public.invoices
  add column if not exists invoice_number text,
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by_user_id uuid references auth.users(id) on delete restrict;

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft', 'finalized'));

create unique index if not exists invoices_workspace_invoice_number_idx
  on public.invoices (workspace_id, invoice_number)
  where invoice_number is not null;

create table if not exists public.invoice_number_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  counter_date date not null,
  last_sequence integer not null default 0 check (last_sequence >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, counter_date)
);

drop trigger if exists set_invoice_number_counters_updated_at on public.invoice_number_counters;
create trigger set_invoice_number_counters_updated_at
before update on public.invoice_number_counters
for each row execute procedure public.set_current_timestamp_updated_at();

create or replace function public.allocate_invoice_number(
  p_workspace_id uuid,
  p_invoice_date date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_sequence integer;
begin
  insert into public.invoice_number_counters (workspace_id, counter_date, last_sequence)
  values (p_workspace_id, p_invoice_date, 1)
  on conflict (workspace_id, counter_date)
  do update
    set last_sequence = public.invoice_number_counters.last_sequence + 1,
        updated_at = timezone('utc', now())
  returning last_sequence into next_sequence;

  return format(
    'INV-%s-%s',
    to_char(p_invoice_date, 'YYYYMMDD'),
    lpad(next_sequence::text, 3, '0')
  );
end;
$$;

create or replace function public.finalize_invoice(
  p_workspace_id uuid,
  p_invoice_id uuid,
  p_user_id uuid
)
returns table (invoice_id uuid, invoice_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_invoice public.invoices%rowtype;
  next_sequence integer;
  next_invoice_number text;
begin
  select *
  into current_invoice
  from public.invoices
  where id = p_invoice_id
    and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Invoice not found in this workspace.';
  end if;

  if current_invoice.status <> 'draft' then
    raise exception 'Only draft invoices can be finalized.';
  end if;

  insert into public.invoice_number_counters (workspace_id, counter_date, last_sequence)
  values (p_workspace_id, current_invoice.invoice_date, 1)
  on conflict (workspace_id, counter_date)
  do update
    set last_sequence = public.invoice_number_counters.last_sequence + 1,
        updated_at = timezone('utc', now())
  returning last_sequence into next_sequence;

  next_invoice_number := format(
    'INV-%s-%s',
    to_char(current_invoice.invoice_date, 'YYYYMMDD'),
    lpad(next_sequence::text, 3, '0')
  );

  update public.invoices
  set status = 'finalized',
      invoice_number = next_invoice_number,
      finalized_at = timezone('utc', now()),
      finalized_by_user_id = p_user_id,
      updated_by_user_id = p_user_id
  where id = current_invoice.id
  returning invoices.id, invoices.invoice_number
  into invoice_id, invoice_number;

  return next;
end;
$$;
