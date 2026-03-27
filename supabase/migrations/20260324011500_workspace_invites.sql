create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('admin', 'member')),
  token text not null unique default gen_random_uuid()::text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default timezone('utc', now()) + interval '14 days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workspace_invites_workspace_id_idx
  on public.workspace_invites (workspace_id);

create index if not exists workspace_invites_invited_email_idx
  on public.workspace_invites (lower(invited_email));

create unique index if not exists workspace_invites_pending_unique_idx
  on public.workspace_invites (workspace_id, lower(invited_email))
  where status = 'pending';

drop trigger if exists set_workspace_invites_updated_at on public.workspace_invites;
create trigger set_workspace_invites_updated_at
before update on public.workspace_invites
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.workspace_invites enable row level security;

drop policy if exists "Members can read invites for own workspace" on public.workspace_invites;
create policy "Members can read invites for own workspace"
on public.workspace_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_invites.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert invites" on public.workspace_invites;
create policy "Admins can insert invites"
on public.workspace_invites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_invites.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update invites" on public.workspace_invites;
create policy "Admins can update invites"
on public.workspace_invites
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_invites.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = workspace_invites.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
