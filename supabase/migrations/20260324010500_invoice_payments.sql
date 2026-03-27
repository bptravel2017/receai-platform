alter table public.invoices
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_amount_cents integer not null default 0,
  add column if not exists payment_date date,
  add column if not exists payment_reference text,
  add column if not exists payment_note text;

alter table public.invoices
  drop constraint if exists invoices_payment_status_check;

alter table public.invoices
  add constraint invoices_payment_status_check
  check (payment_status in ('unpaid', 'partial', 'paid'));

alter table public.invoices
  drop constraint if exists invoices_paid_amount_cents_check;

alter table public.invoices
  add constraint invoices_paid_amount_cents_check
  check (paid_amount_cents >= 0);

create index if not exists invoices_workspace_payment_status_idx
  on public.invoices (workspace_id, payment_status);
