-- Add intent to an existing call_logs table.
alter table public.call_logs
  add column if not exists intent text not null default '—';
