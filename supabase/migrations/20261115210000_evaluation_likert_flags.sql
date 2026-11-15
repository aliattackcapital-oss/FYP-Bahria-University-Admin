-- VOCA human evaluation: Likert ratings, suggestions, admin flag workflow
-- Apply after 20261115190000_phase2_5_extensions.sql

alter table public.call_evaluations
  alter column verdict drop not null;

alter table public.call_evaluations
  add column if not exists rating_q1 smallint check (rating_q1 between 1 and 5),
  add column if not exists rating_q2 smallint check (rating_q2 between 1 and 5),
  add column if not exists rating_q3 smallint check (rating_q3 between 1 and 5),
  add column if not exists rating_q4 smallint check (rating_q4 between 1 and 5),
  add column if not exists rating_q5 smallint check (rating_q5 between 1 and 5),
  add column if not exists average_rating numeric(4, 2),
  add column if not exists suggestions text,
  add column if not exists flag_for_admin boolean not null default false,
  add column if not exists flag_priority text check (
    flag_priority is null or flag_priority in ('normal', 'urgent')
  ),
  add column if not exists flag_reason text;

update public.call_evaluations
set suggestions = notes
where suggestions is null and notes is not null;

create type public.call_admin_flag_status as enum (
  'flagged',
  'under_review',
  'changes_implemented',
  'resolved'
);

create table if not exists public.call_evaluation_admin_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  evaluation_id uuid not null references public.call_evaluations (id) on delete cascade,
  call_id text not null,
  status public.call_admin_flag_status not null default 'flagged',
  admin_notes text,
  changes_documented text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_updated_by_member_id uuid references public.organization_members (id) on delete set null,
  unique (evaluation_id)
);

create index if not exists call_evaluation_admin_flags_org_status_idx
  on public.call_evaluation_admin_flags (organization_id, status);

create table if not exists public.call_evaluation_admin_flag_history (
  id uuid primary key default gen_random_uuid(),
  admin_flag_id uuid not null references public.call_evaluation_admin_flags (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  from_status public.call_admin_flag_status,
  to_status public.call_admin_flag_status not null,
  admin_member_id uuid references public.organization_members (id) on delete set null,
  admin_notes text,
  changes_documented text,
  created_at timestamptz not null default now()
);

create index if not exists call_evaluation_admin_flag_history_flag_idx
  on public.call_evaluation_admin_flag_history (admin_flag_id, created_at desc);

alter table public.call_evaluation_admin_flags enable row level security;
alter table public.call_evaluation_admin_flag_history enable row level security;