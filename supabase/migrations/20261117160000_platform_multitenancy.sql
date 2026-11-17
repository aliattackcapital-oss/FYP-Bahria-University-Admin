-- Platform (omega) multi-tenancy: per-org voice agents + call log scoping

create type public.platform_operator_status as enum ('active', 'suspended');

create table if not exists public.platform_operators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  email text not null,
  display_name text,
  status public.platform_operator_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_operators_email_lower_idx
  on public.platform_operators (lower(email));

alter table public.platform_operators enable row level security;

alter table public.organizations
  add column if not exists retell_agent_id text,
  add column if not exists retell_knowledge_base_id text,
  add column if not exists retell_llm_id text,
  add column if not exists status text not null default 'active';

create index if not exists organizations_retell_agent_idx
  on public.organizations (retell_agent_id)
  where retell_agent_id is not null;

alter table public.call_logs
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

create index if not exists call_logs_organization_id_idx
  on public.call_logs (organization_id, started_at desc);

-- One organization membership per email (product rule)
create unique index if not exists organization_members_email_global_idx
  on public.organization_members (lower(email));

-- Backfill existing calls to default Bahria org
update public.call_logs
set organization_id = o.id
from public.organizations o
where public.call_logs.organization_id is null
  and o.slug = 'bahria-khi';