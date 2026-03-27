create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('invoice_sent')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists usage_logs_workspace_type_created_at_idx
  on public.usage_logs (workspace_id, type, created_at desc);

alter table public.usage_logs enable row level security;

drop policy if exists "Members can read usage logs" on public.usage_logs;
create policy "Members can read usage logs"
on public.usage_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = usage_logs.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert usage logs" on public.usage_logs;
create policy "Admins can insert usage logs"
on public.usage_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = usage_logs.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
