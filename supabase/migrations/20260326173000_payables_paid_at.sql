alter table public.costs
  add column if not exists paid_at timestamptz;

create index if not exists costs_workspace_paid_at_idx
  on public.costs (workspace_id, paid_at desc);

update public.costs
set paid_at = coalesce(paid_at, updated_at)
where payment_status = 'paid'
  and paid_at is null;
