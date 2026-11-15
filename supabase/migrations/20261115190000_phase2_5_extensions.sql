-- Phases 2–5: invitation status, call evaluations, tighten call_logs RLS
-- Run after 20261115180000_organizations.sql

alter table public.organization_invitations
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'revoked', 'expired'));

create type public.call_eval_verdict as enum (
  'correct',
  'partially_correct',
  'incorrect',
  'unable_to_assess'
);

create table if not exists public.call_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  call_id text not null,
  reviewer_member_id uuid references public.organization_members (id) on delete set null,
  verdict public.call_eval_verdict not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, call_id)
);

create index if not exists call_evaluations_org_idx
  on public.call_evaluations (organization_id);

alter table public.call_evaluations enable row level security;

-- Remove permissive call_logs policies (server uses service_role)
drop policy if exists "public_select_call_logs" on public.call_logs;
drop policy if exists "public_insert_call_logs" on public.call_logs;
drop policy if exists "public_update_call_logs" on public.call_logs;

alter table public.call_logs enable row level security;