alter table public.revenue_records
  add column if not exists driver_id uuid references public.fulfillment_parties(id) on delete set null,
  add column if not exists vendor_id uuid references public.fulfillment_parties(id) on delete set null,
  add column if not exists guide_id uuid references public.fulfillment_parties(id) on delete set null;

create index if not exists revenue_records_workspace_driver_idx
  on public.revenue_records (workspace_id, driver_id);

create index if not exists revenue_records_workspace_vendor_idx
  on public.revenue_records (workspace_id, vendor_id);

create index if not exists revenue_records_workspace_guide_idx
  on public.revenue_records (workspace_id, guide_id);
