create table if not exists public.bank_statement_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_name text not null,
  note text,
  imported_transaction_count integer not null default 0 check (imported_transaction_count >= 0),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  import_batch_id uuid not null references public.bank_statement_imports(id) on delete cascade,
  transaction_date date not null,
  amount_cents integer not null,
  currency text not null default 'USD',
  description text not null,
  reference text,
  reconciliation_status text not null default 'unmatched',
  linked_invoice_id uuid references public.invoices(id) on delete set null,
  reconciled_at timestamptz,
  reconciled_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bank_transactions_reconciliation_status_check
    check (reconciliation_status in ('unmatched', 'matched'))
);

create index if not exists bank_statement_imports_workspace_id_idx
  on public.bank_statement_imports (workspace_id);

create index if not exists bank_transactions_workspace_id_idx
  on public.bank_transactions (workspace_id);

create index if not exists bank_transactions_workspace_reconciliation_idx
  on public.bank_transactions (workspace_id, reconciliation_status);

create index if not exists bank_transactions_workspace_invoice_idx
  on public.bank_transactions (workspace_id, linked_invoice_id);

drop trigger if exists set_bank_statement_imports_updated_at on public.bank_statement_imports;
create trigger set_bank_statement_imports_updated_at
before update on public.bank_statement_imports
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists set_bank_transactions_updated_at on public.bank_transactions;
create trigger set_bank_transactions_updated_at
before update on public.bank_transactions
for each row execute procedure public.set_current_timestamp_updated_at();

alter table public.bank_statement_imports enable row level security;
alter table public.bank_transactions enable row level security;

drop policy if exists "Members can read bank statement imports" on public.bank_statement_imports;
create policy "Members can read bank statement imports"
on public.bank_statement_imports
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_statement_imports.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert bank statement imports" on public.bank_statement_imports;
create policy "Admins can insert bank statement imports"
on public.bank_statement_imports
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_statement_imports.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update bank statement imports" on public.bank_statement_imports;
create policy "Admins can update bank statement imports"
on public.bank_statement_imports
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_statement_imports.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_statement_imports.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Members can read bank transactions" on public.bank_transactions;
create policy "Members can read bank transactions"
on public.bank_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_transactions.workspace_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert bank transactions" on public.bank_transactions;
create policy "Admins can insert bank transactions"
on public.bank_transactions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_transactions.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Admins can update bank transactions" on public.bank_transactions;
create policy "Admins can update bank transactions"
on public.bank_transactions
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_transactions.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = bank_transactions.workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);
