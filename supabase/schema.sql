create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company_name text,
  billing_address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  type text not null check (type in ('daytime', 'transfer', 'other')),
  title text not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(12, 2) not null,
  currency text not null default 'USD',
  notes text,
  source text,
  invoice_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  revenue_record_id uuid not null unique references public.revenue_records(id) on delete cascade,
  status text not null check (status in ('draft', 'issued', 'paid', 'void')),
  currency text not null default 'USD',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null,
  total_amount numeric(12, 2) not null,
  issued_at timestamptz not null default timezone('utc', now()),
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_email_idx on public.customers (email);
create index if not exists revenue_records_customer_id_idx on public.revenue_records (customer_id);
create index if not exists revenue_records_type_idx on public.revenue_records (type);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoices_revenue_record_id_idx on public.invoices (revenue_record_id);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists set_revenue_records_updated_at on public.revenue_records;
create trigger set_revenue_records_updated_at
before update on public.revenue_records
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.revenue_records enable row level security;
alter table public.invoices enable row level security;
