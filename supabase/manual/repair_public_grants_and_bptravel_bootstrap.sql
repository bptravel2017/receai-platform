-- Restores the grants expected by 20260324011600_public_schema_grants.sql,
-- then inspects and minimally repairs the auth bootstrap records for:
--   bptravel2017@gmail.com
--   bf003fa9-70ff-4d3e-a850-81de730e49cd

begin;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
on all tables in schema public
to authenticated, service_role;

grant usage, select
on all sequences in schema public
to authenticated, service_role;

grant execute
on all functions in schema public
to authenticated, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables
to authenticated, service_role;

alter default privileges in schema public
grant usage, select on sequences
to authenticated, service_role;

alter default privileges in schema public
grant execute on functions
to authenticated, service_role;

commit;

select
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data,
  raw_app_meta_data
from auth.users
where id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd';

select *
from public.profiles
where id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd';

select *
from public.workspace_memberships
where user_id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd'
order by created_at asc nulls last;

select *
from public.workspaces
where owner_user_id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd'
   or id in (
     select workspace_id
     from public.workspace_memberships
     where user_id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd'
   )
order by created_at asc;

do $$
declare
  target_user_id constant uuid := 'bf003fa9-70ff-4d3e-a850-81de730e49cd';
  target_email constant text := 'bptravel2017@gmail.com';
  email_prefix text := split_part(target_email, '@', 1);
  resolved_full_name text;
  workspace_name text;
  workspace_slug_base text;
  workspace_slug text;
  resolved_workspace_id uuid;
  existing_default_workspace_id uuid;
begin
  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and email = target_email
  ) then
    raise exception 'Expected auth.users row not found for % / %', target_email, target_user_id;
  end if;

  select nullif(trim(raw_user_meta_data ->> 'full_name'), '')
  into resolved_full_name
  from auth.users
  where id = target_user_id;

  if resolved_full_name is not null then
    workspace_name := resolved_full_name || '''s Workspace';
  else
    workspace_name := email_prefix || '''s Workspace';
  end if;

  workspace_slug_base := left(
    trim(both '-' from regexp_replace(lower(workspace_name), '[^a-z0-9]+', '-', 'g')),
    48
  );

  if workspace_slug_base = '' then
    workspace_slug_base := 'receai-workspace';
  end if;

  select p.default_workspace_id
  into existing_default_workspace_id
  from public.profiles p
  where p.id = target_user_id;

  select m.workspace_id
  into resolved_workspace_id
  from public.workspace_memberships m
  join public.workspaces w
    on w.id = m.workspace_id
  where m.user_id = target_user_id
  order by
    case when m.workspace_id = existing_default_workspace_id then 0 else 1 end,
    m.created_at asc,
    m.id asc
  limit 1;

  if resolved_workspace_id is null and existing_default_workspace_id is not null then
    select w.id
    into resolved_workspace_id
    from public.workspaces w
    where w.id = existing_default_workspace_id;
  end if;

  if resolved_workspace_id is null then
    workspace_slug := workspace_slug_base;

    if exists (
      select 1
      from public.workspaces
      where slug = workspace_slug
    ) then
      workspace_slug := left(workspace_slug_base, 40) || '-' || substr(replace(target_user_id::text, '-', ''), 1, 7);
    end if;

    insert into public.workspaces (name, slug, owner_user_id, reply_to_email)
    values (workspace_name, workspace_slug, target_user_id, null)
    returning id into resolved_workspace_id;
  end if;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (resolved_workspace_id, target_user_id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = excluded.role;

  insert into public.profiles (id, email, full_name, default_workspace_id)
  values (target_user_id, target_email, resolved_full_name, resolved_workspace_id)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        default_workspace_id = excluded.default_workspace_id;
end
$$;

select
  p.id,
  p.email,
  p.full_name,
  p.default_workspace_id
from public.profiles p
where p.id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd';

select
  m.id,
  m.workspace_id,
  m.user_id,
  m.role,
  m.created_at
from public.workspace_memberships m
where m.user_id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd'
order by m.created_at asc nulls last, m.id asc;

select
  w.id,
  w.name,
  w.slug,
  w.owner_user_id,
  w.reply_to_email,
  w.created_at
from public.workspaces w
where w.owner_user_id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd'
   or w.id in (
     select p.default_workspace_id
     from public.profiles p
     where p.id = 'bf003fa9-70ff-4d3e-a850-81de730e49cd'
   )
order by w.created_at asc, w.id asc;
