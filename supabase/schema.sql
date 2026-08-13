-- Run this in the Supabase SQL editor once.

create table if not exists public.call_logs (
  id text primary key,
  name text not null default 'Web caller',
  phone text not null default '—',
  email text not null default '—',
  enrollment text not null default '—',
  intent text not null default '—',
  duration_seconds integer not null default 0,
  started_at timestamptz not null default now(),
  summary text,
  audio_url text,
  transcript jsonb not null default '[]'::jsonb,
  call_status text,
  analyzed boolean not null default false,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_logs_started_at_idx on public.call_logs (started_at desc);

alter table public.call_logs enable row level security;

drop policy if exists "public_select_call_logs" on public.call_logs;
create policy "public_select_call_logs"
  on public.call_logs for select
  using (true);

drop policy if exists "public_insert_call_logs" on public.call_logs;
create policy "public_insert_call_logs"
  on public.call_logs for insert
  with check (true);

drop policy if exists "public_update_call_logs" on public.call_logs;
create policy "public_update_call_logs"
  on public.call_logs for update
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('call-recordings', 'call-recordings', true)
on conflict (id) do nothing;

drop policy if exists "public_select_recordings" on storage.objects;
create policy "public_select_recordings"
  on storage.objects for select
  using (bucket_id = 'call-recordings');

drop policy if exists "public_insert_recordings" on storage.objects;
create policy "public_insert_recordings"
  on storage.objects for insert
  with check (bucket_id = 'call-recordings');

drop policy if exists "public_update_recordings" on storage.objects;
create policy "public_update_recordings"
  on storage.objects for update
  using (bucket_id = 'call-recordings')
  with check (bucket_id = 'call-recordings');
