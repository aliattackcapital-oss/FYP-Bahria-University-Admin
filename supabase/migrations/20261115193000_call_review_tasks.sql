-- Phase 4 (FYP): one review task per call, claimable queue

create type public.review_task_status as enum (
  'processing',
  'unassigned',
  'assigned',
  'in_review',
  'completed'
);

create table if not exists public.call_review_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  call_id text not null,
  status public.review_task_status not null default 'processing',
  assigned_member_id uuid references public.organization_members (id) on delete set null,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (call_id)
);

create index if not exists call_review_tasks_org_status_idx
  on public.call_review_tasks (organization_id, status);

create index if not exists call_review_tasks_assigned_idx
  on public.call_review_tasks (assigned_member_id)
  where assigned_member_id is not null;

alter table public.call_review_tasks enable row level security;