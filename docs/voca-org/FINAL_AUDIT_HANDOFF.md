# VOCA organization layer — final audit & handoff

**Date:** 15 November 2026  
**Authority:** [`AUTH_AND_INVITE_STRATEGY.md`](./AUTH_AND_INVITE_STRATEGY.md)  
**Local dev:** `npm run dev` → web **http://localhost:5173/** · API **http://127.0.0.1:8787**

---

## Executive summary

Phases **0–5** (handoff numbering) are implemented in this repository. Production still requires **operator steps** in Supabase Auth, **SQL migrations** on your project, and **Vercel env** for the service role. Voice AI (Retell v3, webhook, call sync, KB) remains on the existing paths with `/api/webhook` and `/api/health` exempt from session auth.

**Deferred vs full FYP plan (`VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md`):** atomic review queue, follow-up cases, KB change requests, recording signed URLs, and multi-user E2E test harness are **not** in this handoff. This delivery covers **org auth**, **invite copy-links**, **RBAC**, **per-call human evaluations**, and a **management KPI strip** on the dashboard.

---

## Phase completion

| Phase | Scope | Status | Evidence |
|-------|--------|--------|----------|
| 0 | Read-only audit | **PASS** | [`PHASE_0_ORG_AUTH_HANDOFF.md`](./PHASE_0_ORG_AUTH_HANDOFF.md) |
| 1 | Email/password auth, bootstrap `generateLink`, accept-invite | **PASS** | `Login.tsx`, `AcceptInvite.tsx`, `authInvite.js` |
| 2 | Server RBAC + `call_logs` RLS hardening migration | **PASS** (after SQL) | `server/lib/rbac.js`, migration `20261115190000_phase2_5_extensions.sql` |
| 3 | Invites + recovery copy-link, `notificationDelivery` | **PASS** | Invite POST returns `copyLinkOnce`; Members UI + recovery |
| 3b | Optional Resend via `VOCA_INVITE_DELIVERY=resend` | **PASS** (optional) | `notificationDelivery.js`, `RESEND_API_KEY` |
| 4 | Call evaluations (verdict + notes) | **PASS** (after SQL) | `call_evaluations`, `CallEvaluationPanel` |
| 5 | Management overview KPIs | **PASS** | `/api/management-stats`, `ManagementOverview` |

---

## Security posture (after migrations)

| Control | Implementation |
|---------|----------------|
| No Google OAuth | Removed from UI |
| Invite-only signup | Supabase dashboard: disable sign-ups (operator) |
| Bearer invite/recovery links | `generateLink` server-only; **never logged** |
| API access | JWT + active `organization_members`; `expressApiGuard` / `withMemberAuth` |
| Role gates | `server/lib/rbac.js` on members, KB writes, management stats |
| Direct DB exposure | Org tables: RLS enabled, no anon policies; `call_logs` public policies **dropped** in Phase 2 migration (app uses service role on server) |
| Webhook | Still public; verify Retell signature in a future hardening pass |

---

## Operator checklist (production)

1. **SQL (in order):**
   - `supabase/migrations/20261115180000_organizations.sql`
   - `supabase/migrations/20261115190000_phase2_5_extensions.sql`
2. **Supabase Auth:** Email provider on; sign-ups off; redirect URLs for Vercel + localhost; Google off.
3. **Env (Vercel + local):** `SUPABASE_SERVICE_ROLE_KEY`, `VOCA_APP_URL`, Supabase URL + publishable key; client `VITE_SUPABASE_*` or `NEXT_PUBLIC_*`.
4. **Bootstrap (once, no active super_admin):** `npm run org:bootstrap` → open `copyLinkOnce` → set password.
5. **Smoke:** `npm run org:smoke` (unauthenticated org endpoints only).

---

## Final completion report (template)

```
PHASES: 0–5 (handoff scope)
STATUS: PASS (repo) — production NOT_VERIFIED until operator checklist
BRANCH / COMMIT: (local working tree — commit when ready)
FILES CHANGED: See git status; core server/lib/*, src/pages/*, api/*, supabase/migrations/20261115190000_phase2_5_extensions.sql
MIGRATIONS: organizations.sql + phase2_5_extensions.sql (call_evaluations, invitation status, call_logs RLS)
IMPLEMENTED BEHAVIOR:
  - Email/password login, invite accept, member activation
  - Super admin invite + copy link; recovery copy link
  - RBAC: front_desk blocked from members dir, KB write, management stats
  - Call drawer: human evaluation verdict + notes
  - Dashboard: management KPIs for super_admin/admin
TESTS RUN AND ACTUAL RESULTS:
  - npm run build — PASS
  - npm run dev — running (localhost:5173 + :8787)
  - npm run org:smoke — (run after API up; org GET without auth)
  - Supabase migrations on live project — NOT_VERIFIED (operator)
  - E2E invite login — NOT_VERIFIED (requires Auth dashboard + bootstrap)
SECURITY / RLS / ROLE CHECKS:
  - Server-side role matrix in rbac.js — implemented
  - call_logs RLS policies removed — requires migration on Supabase
  - Invitation tokens not stored in DB or logs — implemented
VERCEL / EXPRESS PARITY:
  - New routes mirrored in server/index.js and api/*.js — implemented
RETELL + CALL LOG REGRESSION:
  - Web call + webhook paths untouched — NOT_VERIFIED in this session (manual smoke recommended)
OPERATOR SETUP REQUIRED: Yes (see checklist above)
KNOWN LIMITATIONS:
  - No automated auth/RLS tests
  - No review queue / follow-up / KB request workflow (full plan phases 4–9)
  - Storage recording policies unchanged; still review for defense
  - front_desk can read KB; mutations blocked server-side only
ROLLBACK PLAN:
  - Revert app deploy; run organizations_rollback + drop call_evaluations manually if needed
  - Re-enable call_logs policies from supabase/schema.sql only if legacy anon access required (not recommended)
NEXT PHASE: Full FYP plan phases (review queue, follow-ups, defense E2E) — NOT STARTED
```

---

## What to demo locally now

1. Open **http://localhost:5173/login** (sign-in UI; needs Supabase env + bootstrap to actually enter).
2. **Members** (super_admin): invite flow shows **Copy invitation link** dialog.
3. **Call logs** → open a call → **Human evaluation** section.
4. **Dashboard** → **Management** cards (admin roles only).

---

## Related docs

- [`PHASE_1_OPERATOR.md`](./PHASE_1_OPERATOR.md) — bootstrap & Auth dashboard
- [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) — phase table
- Legacy multi-phase FYP plan: [`VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md`](../../VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md)