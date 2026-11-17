# Platform (omega) admin — multi-tenant organizations

## Roles

| Role | Access |
|------|--------|
| **Platform admin** (`platform_operators`) | `/platform` — usage across tenants, create/delete organizations, invite super admins |
| **Super admin** (per org) | Existing org admin surface |
| **Admin / front desk** | Unchanged, scoped to their organization |

One email may belong to **one organization** (global unique on `organization_members.email`).

## Database

Apply migration (local or Supabase SQL):

```bash
npm run db:migrate:platform
```

Backfill legacy Bahria agent/KB ids from env onto the `bahria-khi` org:

```bash
npm run org:backfill-voice
```

## Bootstrap first platform admin (once)

1. Set `VOCA_PLATFORM_BOOTSTRAP_SECRET` in `.env`.
2. `POST /api/platform/bootstrap` with JSON `{ "email": "you@example.com", "displayName": "Platform Admin" }` and header `x-platform-bootstrap-secret: <secret>`.
3. Open returned `copyLinkOnce`, set password, sign in → **Organizations** at `/platform`.

## Create organization

Platform UI **Create organization** or `POST /api/platform/organizations`:

- `organizationName`
- `websiteUrl` (https; seeded as the first Retell KB URL with auto-refresh)
- `superAdminEmail`

Server flow: Retell **KB** (org website URL) → **LLM** (placeholder prompt) → **agent** → publish → Supabase org row (stores `website_url`) → invite super admin (`copyLinkOnce`).

## Runtime

- Auth resolves org from **membership**, not `VOCA_ORG_SLUG`.
- Calls, dashboard stats, KB, and agent prompt use **per-org** `retell_agent_id` / `retell_knowledge_base_id` (env fallback for legacy).
- Webhooks map `agent_id` → organization for `call_logs.organization_id`.

## Env

See `.env.example`: `RETELL_DEFAULT_VOICE_ID`, `VOCA_PLATFORM_BOOTSTRAP_SECRET`.