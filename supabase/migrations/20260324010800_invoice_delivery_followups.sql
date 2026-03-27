alter table public.invoice_delivery_events
  add column if not exists action_type text;

update public.invoice_delivery_events
set action_type = 'send'
where action_type is null;

alter table public.invoice_delivery_events
  alter column action_type set not null;

alter table public.invoice_delivery_events
  drop constraint if exists invoice_delivery_events_action_type_check;

alter table public.invoice_delivery_events
  add constraint invoice_delivery_events_action_type_check
  check (action_type in ('send', 'resend', 'reminder'));
