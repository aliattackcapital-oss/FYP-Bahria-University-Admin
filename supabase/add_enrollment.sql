-- Add enrollment to an existing call_logs table.
alter table public.call_logs
  add column if not exists enrollment text not null default '—';
