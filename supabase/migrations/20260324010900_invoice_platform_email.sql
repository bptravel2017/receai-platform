alter table public.workspaces
  add column if not exists reply_to_email text;

alter table public.invoices
  add column if not exists delivery_reply_to_email text;

alter table public.invoices
  drop constraint if exists invoices_delivery_method_check;

alter table public.invoices
  add constraint invoices_delivery_method_check
  check (
    delivery_method is null or delivery_method in ('manual_share', 'external_email', 'platform_email')
  );

alter table public.invoice_delivery_events
  add column if not exists reply_to_email text,
  add column if not exists provider_message_id text,
  add column if not exists error_message text;

alter table public.invoice_delivery_events
  drop constraint if exists invoice_delivery_events_delivery_status_check;

alter table public.invoice_delivery_events
  add constraint invoice_delivery_events_delivery_status_check
  check (delivery_status in ('sent', 'failed'));

alter table public.invoice_delivery_events
  drop constraint if exists invoice_delivery_events_delivery_method_check;

alter table public.invoice_delivery_events
  add constraint invoice_delivery_events_delivery_method_check
  check (delivery_method in ('manual_share', 'external_email', 'platform_email'));
