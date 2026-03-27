alter table public.invoices
  add column if not exists delivery_status text not null default 'not_sent',
  add column if not exists sent_at timestamptz,
  add column if not exists sent_by_user_id uuid references auth.users(id) on delete restrict;

alter table public.invoices
  drop constraint if exists invoices_delivery_status_check;

alter table public.invoices
  add constraint invoices_delivery_status_check
  check (delivery_status in ('not_sent', 'sent'));

create index if not exists invoices_workspace_delivery_status_idx
  on public.invoices (workspace_id, delivery_status);
