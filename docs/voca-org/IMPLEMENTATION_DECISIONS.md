# Implementation decisions — Phase 0 + Phase 1 proposal

Decisions **locked by** [`VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md`](../../VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md) unless noted below.

## A. Confirmed from plan (no change)

- Roles: `super_admin`, `admin`, `front_desk`.
- Single organization (Bahria) first; schema may include `organization_id` for future multi-org.
- Supabase Auth + Google; login requires **pre-approved membership**.
- Review/follow-up/KB workflows as specified in plan §2 and phases 4–8.
- Implement **one phase at a time**; Express/Vercel handler parity preserved.

## B. Phase 0 audit decisions

| Topic | Decision |
|-------|----------|
| Test Supabase for Phases 1–2 | **Recommend** separate Supabase project (`voca-org-staging`) before tightening RLS on production data |
| `call_logs` during Phase 1 | **Do not** rewrite `call_logs` yet; add org tables and **nullable** `organization_id` on `call_logs` in Phase 1 or 2 when RLS is ready |
| Member UI roles | Remap `Academic` / `IT` demo roles away; align UI to three org roles in Phase 3 |
| Webhook auth | Phase 2: implement Retell-recommended verification (document secret in env); until then treat webhook URL as sensitive |
| Recordings | Phase 2: private bucket + signed URLs; migration script to invalidate old public URLs |
| API auth pattern | Phase 2: Supabase JWT on `Authorization: Bearer`; handlers use service role **only** after membership check |

## C. Proposed Phase 1 schema (draft — not applied)

Apply only in **staging** first. Naming uses `snake_case` to match existing `call_logs`.

### `organizations`

```sql
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Seed: one row `slug = 'bahria-khi'`, name `Bahria University Karachi`.

### `organization_members`

```sql
create type public.org_member_role as enum ('super_admin', 'admin', 'front_desk');
create type public.org_member_status as enum ('invited', 'active', 'suspended');

create table public.organization_members (
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

create index organization_members_auth_user_idx
  on public.organization_members (auth_user_id)
  where auth_user_id is not null;
```

**Bootstrap:** Insert Super Admin row with approved `@bahria.edu.pk` email, `status = active`, `auth_user_id` filled on first Google login via secure edge function or one-time admin script (no self-registration).

### `activity_logs` (audit)

```sql
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_member_id uuid references public.organization_members (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_org_created_idx
  on public.activity_logs (organization_id, created_at desc);
```

### Optional: `organization_invitations`

Pre-Google-approve emails before `auth_user_id` exists:

```sql
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_member_role not null default 'front_desk',
  invited_by_member_id uuid references public.organization_members (id),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);
```

### RLS direction (Phase 1 minimal)

- Enable RLS on all new tables.
- **Deny by default** for `anon` and `authenticated`.
- Phase 1 tests: service-role bootstrap only, or policies that allow `authenticated` users to read **their own** `organization_members` row.
- **Do not** open `call_logs` RLS until Phase 2 membership middleware is ready.

### Future link to existing data (Phase 2+)

```sql
-- Phase 2 suggestion only:
-- alter table public.call_logs add column organization_id uuid references public.organizations (id);
```

## D. Phase 1 rollback plan

1. Keep SQL in versioned files under `supabase/migrations/`.
2. Rollback = run companion `down` SQL disabling RLS and dropping new tables **only on staging**.
3. App code in Phase 1 should remain behind feature flag or unused until Phase 2 auth wires up.
4. Production: **no migration** until Phase 1 tests PASS on staging.

## E. Phase 1 suggested file touch list (preview only)

| Area | Files (expected) |
|------|------------------|
| SQL | `supabase/migrations/20261115_organizations.sql` |
| Types | `src/types.ts` (org member types) |
| Server | `server/lib/membership.js` (read member by JWT sub) |
| Docs | Update `IMPLEMENTATION_STATUS.md` |

**Not in Phase 1:** Replacing login UI, webhook changes, review tables.

## F. Isolated test plan (staging)

1. Create Supabase staging project; copy **schema only** (optional: anonymized subset of `call_logs`).
2. Configure Google OAuth redirect to `http://localhost:5173` and staging Vercel URL.
3. Env files: `.env.staging` (gitignored) with staging keys; never commit.
4. Manual tests Phase 1: insert org + members via SQL; verify RLS denies anon select on `organization_members`.
5. Automated: add Vitest + tests for membership helper once Phase 1 code exists.