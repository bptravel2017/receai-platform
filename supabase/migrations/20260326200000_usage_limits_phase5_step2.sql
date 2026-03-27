alter table public.usage_logs
add column if not exists event_type text;

alter table public.usage_logs
add column if not exists count integer not null default 1;

alter table public.usage_logs
add column if not exists period text;

alter table public.usage_logs
alter column type drop not null;

update public.usage_logs
set event_type = coalesce(event_type, type),
    period = coalesce(period, to_char(created_at at time zone 'utc', 'YYYY-MM'))
where event_type is null
   or period is null;

alter table public.usage_logs
alter column event_type set not null;

alter table public.usage_logs
alter column period set not null;

alter table public.usage_logs
drop constraint if exists usage_logs_event_type_check;

alter table public.usage_logs
drop constraint if exists usage_logs_type_check;

alter table public.usage_logs
add constraint usage_logs_type_check
check (type is null or type = 'invoice_sent');

alter table public.usage_logs
add constraint usage_logs_event_type_check
check (
  event_type in (
    'invoice_sent',
    'receipt_created',
    'daytime_created',
    'invoice_created',
    'customer_created',
    'group_created'
  )
);

create index if not exists usage_logs_workspace_event_period_idx
  on public.usage_logs (workspace_id, event_type, period);
