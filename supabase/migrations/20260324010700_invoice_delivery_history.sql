alter table public.invoices
  add column if not exists delivery_recipient_email text,
  add column if not exists delivery_method text check (
    delivery_method is null or delivery_method in ('manual_share', 'external_email')
  ),
  add column if not exists delivery_note text;

create table if not exists public.invoice_delivery_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  delivery_status text not null check (delivery_status in ('sent')),
  delivery_method text not null check (delivery_method in ('manual_share', 'external_email')),
  recipient_email text,
  note text,
  delivered_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists invoice_delivery_events_workspace_invoice_idx
  on public.invoice_delivery_events (workspace_id, invoice_id, created_at desc);

alter table public.invoice_delivery_events enable row level security;

drop policy if exists "Members can read invoice delivery events" on public.invoice_delivery_events;
create policy "Members can read invoice delivery events"
on public.invoice_delivery_events
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoice_delivery_events.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert invoice delivery events" on public.invoice_delivery_events;
create policy "Admins can insert invoice delivery events"
on public.invoice_delivery_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = invoice_delivery_events.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

insert into public.invoice_delivery_events (
  workspace_id,
  invoice_id,
  delivery_status,
  delivery_method,
  recipient_email,
  note,
  delivered_by_user_id,
  created_at
)
select
  invoices.workspace_id,
  invoices.id,
  'sent',
  coalesce(invoices.delivery_method, 'manual_share'),
  invoices.delivery_recipient_email,
  invoices.delivery_note,
  invoices.updated_by_user_id,
  coalesce(invoices.sent_at, invoices.updated_at)
from public.invoices
where invoices.delivery_status = 'sent'
  and not exists (
    select 1
    from public.invoice_delivery_events events
    where events.invoice_id = invoices.id
  );
