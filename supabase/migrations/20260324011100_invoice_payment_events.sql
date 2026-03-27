create table if not exists public.invoice_payment_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  source text not null check (source in ('manual', 'bank')),
  status text not null default 'active' check (status in ('active', 'reversed')),
  amount_cents integer not null check (amount_cents > 0),
  payment_date date not null,
  reference text,
  note text,
  bank_transaction_id uuid references public.bank_transactions(id) on delete set null,
  reversed_at timestamptz,
  reversed_by_user_id uuid references auth.users(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists invoice_payment_events_bank_transaction_id_idx
  on public.invoice_payment_events (bank_transaction_id)
  where bank_transaction_id is not null;

create index if not exists invoice_payment_events_workspace_invoice_idx
  on public.invoice_payment_events (workspace_id, invoice_id);

create index if not exists invoice_payment_events_workspace_status_idx
  on public.invoice_payment_events (workspace_id, status);

drop trigger if exists set_invoice_payment_events_updated_at on public.invoice_payment_events;
create trigger set_invoice_payment_events_updated_at
before update on public.invoice_payment_events
for each row execute procedure public.set_current_timestamp_updated_at();

alter table public.invoice_payment_events enable row level security;

drop policy if exists "Members can read invoice payment events" on public.invoice_payment_events;
create policy "Members can read invoice payment events"
on public.invoice_payment_events
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoice_payment_events.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert invoice payment events" on public.invoice_payment_events;
create policy "Admins can insert invoice payment events"
on public.invoice_payment_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoice_payment_events.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update invoice payment events" on public.invoice_payment_events;
create policy "Admins can update invoice payment events"
on public.invoice_payment_events
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoice_payment_events.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoice_payment_events.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

insert into public.invoice_payment_events (
  workspace_id,
  invoice_id,
  source,
  status,
  amount_cents,
  payment_date,
  reference,
  note,
  created_by_user_id,
  updated_by_user_id
)
select
  invoices.workspace_id,
  invoices.id,
  'manual',
  'active',
  invoices.paid_amount_cents,
  coalesce(invoices.payment_date, invoices.invoice_date),
  invoices.payment_reference,
  invoices.payment_note,
  invoices.updated_by_user_id,
  invoices.updated_by_user_id
from public.invoices
where invoices.paid_amount_cents > 0
  and not exists (
    select 1
    from public.invoice_payment_events events
    where events.invoice_id = invoices.id
  );
