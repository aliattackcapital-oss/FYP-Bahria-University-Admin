# Phase 0 — read-only audit

**Date:** 15 November 2026  
**Scope:** Repository structure, API/auth, Retell integration, Supabase schema/RLS/storage, webhook, members UI, testing baseline. **No live service changes.**

## 1. Repository map (actual)

```text
src/                 React 19 SPA (pages, components, lib)
server/              Express entry + shared business logic
  lib/handlers.js    All HTTP handlers (single source of truth)
  lib/callSync.js    Retell get-call, Supabase upsert, recordings, stats
  lib/knowledgeBase.js, sitemap.js, supabase.js, retellFetch.js
api/                 Vercel serverless wrappers → same handlers
supabase/            schema.sql + additive migrations (intent, enrollment)
docs/voca-org/       Phase artifacts (this audit)
```

**Plan vs repo:** Master plan lives at repo root (`VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md`), not under `docs/voca-org/` as referenced in plan §6; `docs/voca-org/README.md` links to root.

## 2. Frontend routes and auth

| Route | Page | Backend |
|-------|------|---------|
| `/login` | Demo login | None |
| `/` | Dashboard | `/api/dashboard-stats`, web call |
| `/call-logs` | Call logs | `/api/call-logs` |
| `/members` | Members | **None** (in-memory seed) |
| `/knowledge-base` | Retell KB admin | `/api/knowledge-base`, sitemap |
| `/creators` | Static FYP credits | None |

**Auth (`src/lib/auth.ts`):**

- Hard-coded `admin@company.com` / `password123`.
- Sets `localStorage` key `vad_auth=1`.
- `ProtectedRoute` in `src/App.tsx` only checks client flag; **no server session**.

**Gap vs organization plan:** No Google OAuth, no roles, no membership status. Anyone who can hit `/api/*` can read/write sensitive data (see §5).

## 3. API endpoints (Express + Vercel parity)

| Method | Path | Handler | Server-side auth |
|--------|------|---------|------------------|
| GET | `/api/health` | `healthPayload` | None |
| POST | `/api/create-web-call` | Retell v3 | None |
| GET | `/api/call-logs` | Supabase list | None |
| GET | `/api/dashboard-stats` | Supabase aggregates | None |
| GET/POST | `/api/knowledge-base` | Retell KB | None |
| GET/POST | `/api/knowledge-base/sitemap` | Sitemap crawl | None |
| POST | `/api/sync-call` | Retell + Supabase | None |
| POST | `/api/refresh-call-logs` | Bulk Retell sync | None |
| GET/POST | `/api/webhook` | Retell events | **None** (no signature) |

**Parity:** Every `api/*.js` file delegates to `server/lib/handlers.js` — **PASS** (static inspection). Express `server/index.js` registers the same routes.

**CORS:** Express uses `cors({ origin: true })` — permissive for local dev.

## 4. Retell integration

- **Web calls:** `POST https://api.retellai.com/v3/create-web-call`; returns `access_token`, `call_id`, `transport`, `ice_servers`.
- **Client:** `retell-client-js-sdk` ^3.0.4, `src/lib/voiceAgent.ts`.
- **Sync:** `v2/get-call/{id}` in `callSync.js`.
- **KB:** `get-knowledge-base`, `add-knowledge-base-sources`; `retellFetch.js` adds timeout/retry **only** for KB routes (not web call / sync).
- **Webhook:** Accepts `call_ended`, `call_analyzed`; validates `call_id` format only; **does not verify Retell webhook signature or shared secret**.
- **Agent linkage:** Knowledge base is attached in Retell (LLM `knowledge_base_ids`), not in this repo.

**Risks:** Unauthenticated webhook POST can upsert arbitrary-shaped payloads if attacker guesses `call_*` ids and Supabase accepts writes.

## 5. Supabase (from `supabase/schema.sql` and code)

### Tables in use

- **`public.call_logs`** — primary application data (PII: name, phone, email, enrollment, transcript jsonb, summary, `audio_url`).

### RLS (current)

```sql
-- All three policies use (true) for select, insert, update
public_select_call_logs / public_insert_call_logs / public_update_call_logs
```

**Effect:** Any holder of the anon/publishable key (or service role) can read/write all call logs. Suitable for FYP demo; **not** organization-safe.

### Storage

- Bucket `call-recordings`, **`public: true`**.
- Policies allow public select/insert/update on objects in that bucket.
- `storeRecording()` uploads then uses **`getPublicUrl`** — recordings are world-readable if URL is known.

### Server client (`server/lib/supabase.js`)

- Prefers `SUPABASE_SERVICE_ROLE_KEY`, else publishable/anon keys from env.
- Current `.env.example` includes publishable keys; service role optional.
- **Implication:** Production may run with publishable key + open RLS = full data exposure from browser if keys leak.

### Migrations in repo

- `schema.sql` — base `call_logs` + storage
- `add_intent.sql`, `add_enrollment.sql` — column alters  
No Supabase Auth tables, no organizations, no review tables.

## 6. Members UI (mock)

- `src/lib/members.ts` — static seed array.
- Roles in UI: `Admin`, `Front Desk`, `Academic`, `IT` (differs from plan: `super_admin`, `admin`, `front_desk`).
- Invite flow updates React state only; **no persistence**.

## 7. Security risk register (priority)

| ID | Risk | Severity | Phase to address |
|----|------|----------|------------------|
| R1 | All `/api/*` except future webhook hardening are **unauthenticated** | Critical | 2 |
| R2 | **RLS allows public** read/write on `call_logs` | Critical | 1–2 |
| R3 | **Public recording URLs** in storage | High | 2 |
| R4 | **Webhook forgery** (no signature) | High | 2 |
| R5 | Demo login bypass trivial (`localStorage`) | High | 2 |
| R6 | **KB mutations** unauthenticated (Retell API key on server) | High | 2 |
| R7 | `create-web-call` unauthenticated (abuse / cost) | Medium | 2 |
| R8 | `refresh-call-logs` / `sync-call` unauthenticated | Medium | 2 |
| R9 | Secrets in server env only (good) but **no audit logging** | Medium | 1 |
| R10 | No automated security/regression tests | Medium | 1, 9 |
| R11 | `PROJECT_BRIEF.md` outdated (LiveKit) — operator confusion | Low | 9 docs |

## 8. Differences from implementation plan assumptions

| Plan assumption | Actual repo |
|-----------------|-------------|
| LiveKit voice | **Retell v3** gateway (`handlers.js`, `voiceAgent.ts`) |
| Mock call logs | **Supabase-backed** when configured |
| Members backend | **Mock only** |
| Webhook verified | **Not implemented** |
| Tests exist | **No unit/e2e test runner** |
| Plan path `docs/voca-org/VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md` | File at **repo root** |

## 9. Phase 0 operator dependencies (for later phases, not configured here)

- Supabase project with Google OAuth provider enabled.
- Approved email domain or explicit invite list for Bahria.
- Decision: **staging Supabase** vs in-place migration on current project.
- Retell webhook URL and (recommended) signature secret when Retell supports it.
- Vercel env parity: same keys as local `.env.example`.

## 10. What Phase 0 did **not** do

- No SQL applied to any Supabase instance.
- No Retell/Vercel changes.
- No application code changes (documentation only).
- No live API smoke against Retell/Supabase in this phase gate (build/lint only).