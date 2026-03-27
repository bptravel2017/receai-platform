create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_id_idx
  on public.workspace_memberships (user_id);

create index if not exists workspace_memberships_workspace_id_idx
  on public.workspace_memberships (workspace_id);

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'Members can read workspaces'
  ) then
    execute $policy$
      create policy "Members can read workspaces"
      on public.workspaces
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.workspace_memberships membership
          where membership.workspace_id = workspaces.id
            and membership.user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'Owners can update workspaces'
  ) then
    execute $policy$
      create policy "Owners can update workspaces"
      on public.workspaces
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.workspace_memberships membership
          where membership.workspace_id = workspaces.id
            and membership.user_id = auth.uid()
            and membership.role in ('owner', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.workspace_memberships membership
          where membership.workspace_id = workspaces.id
            and membership.user_id = auth.uid()
            and membership.role in ('owner', 'admin')
        )
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_memberships'
      and policyname = 'Users can read own memberships'
  ) then
    execute $policy$
      create policy "Users can read own memberships"
      on public.workspace_memberships
      for select
      to authenticated
      using (auth.uid() = user_id)
    $policy$;
  end if;
end
$$;
