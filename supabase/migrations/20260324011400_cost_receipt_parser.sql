alter table public.cost_receipt_intakes
add column if not exists parse_status text not null default 'not_started'
check (parse_status in ('not_started', 'parsed', 'failed')),
add column if not exists parser_name text,
add column if not exists parser_version text,
add column if not exists parse_attempted_at timestamptz,
add column if not exists parsed_at timestamptz,
add column if not exists parse_error text;

update public.cost_receipt_intakes
set
  parse_status = case
    when status = 'failed' then 'failed'
    when candidate_date is not null
      or candidate_vendor_name is not null
      or candidate_amount_cents is not null
      or candidate_description is not null
      or candidate_note is not null then 'parsed'
    else 'not_started'
  end,
  parser_name = case
    when candidate_date is not null
      or candidate_vendor_name is not null
      or candidate_amount_cents is not null
      or candidate_description is not null
      or candidate_note is not null then coalesce(parser_name, 'receipt_scaffold_heuristic')
    else parser_name
  end,
  parser_version = case
    when candidate_date is not null
      or candidate_vendor_name is not null
      or candidate_amount_cents is not null
      or candidate_description is not null
      or candidate_note is not null then coalesce(parser_version, 'v1')
    else parser_version
  end,
  parsed_at = case
    when candidate_date is not null
      or candidate_vendor_name is not null
      or candidate_amount_cents is not null
      or candidate_description is not null
      or candidate_note is not null then coalesce(parsed_at, updated_at)
    else parsed_at
  end,
  parse_attempted_at = coalesce(parse_attempted_at, updated_at),
  parse_error = case
    when status = 'failed' and parse_error is null
      then 'Receipt review previously ended in a failed state before parser metadata was added.'
    else parse_error
  end;
