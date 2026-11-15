-- Phase 1: organization foundation (run in Supabase SQL editor or via CLI)
-- Rollback: 20261115180000_organizations_rollback.sql

create type public.org_member_role as enum ('super_admin', 'admin', 'front_desk');
create type public.org_member_status as enum ('invited', 'active', 'suspended');

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null,
  email text not null,
  display_name text,
  role public.org_member_role not null,
  status public.org_member_status not null default 'invited',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists organization_members_org_idx
  on public.organization_members (organization_id);

create index if not exists organization_members_auth_user_idx
  on public.organization_members (auth_user_id)
  where auth_user_id is not null;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_member_id uuid references public.organization_members (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_org_created_idx
  on public.activity_logs (organization_id, created_at desc);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_member_role not null default 'front_desk',
  invited_by_member_id uuid references public.organization_members (id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

-- Default Bahria organization (single-tenant FYP)
insert into public.organizations (slug, name)
values ('bahria-khi', 'Bahria University Karachi')
on conflict (slug) do nothing;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.activity_logs enable row level security;
alter table public.organization_invitations enable row level security;

-- No permissive policies: anon/authenticated denied; server uses service_role (bypasses RLS).