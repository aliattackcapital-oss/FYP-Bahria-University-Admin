# Phase 0 — Organization auth handoff audit

**Last updated:** 15 November 2026 (invitation strategy revision)  
**Authority:** [`AUTH_AND_INVITE_STRATEGY.md`](./AUTH_AND_INVITE_STRATEGY.md)  
**Scope:** Read-only. **No code, DB, Vercel, or production Auth config changes.**

---

## 1. Current architecture summary

### Voice AI — preserve

| Component | Location |
|-----------|----------|
| Retell v3 web calls | `handleCreateWebCall`, `voiceAgent.ts` |
| Webhook + sync | `/api/webhook`, `callSync.js` |
| Call logs / stats | Supabase `call_logs` |
| Knowledge base | Retell via `/api/knowledge-base` |

Exempt **`/api/health`** and **`/api/webhook`** from session middleware in all future auth work.

### App stack

React 19 + Vite, Express + Vercel `api/*` → `server/lib/handlers.js`, Supabase Postgres.

### Auth (interim — to be replaced)

- **UI:** Google OAuth (`AuthContext.signInWithGoogle`).
- **API:** JWT via publishable key + `organization_members` (`server/lib/auth.js`, `expressApiGuard`).
- **Invite:** `POST /api/organization/members` + optional Resend in `server/lib/email.js` — **does not match** copy-link `generateLink` strategy.

### Organization data (Supabase `oenzdaxoskukgzxaewdq`)

| Table | Status |
|-------|--------|
| `organizations` | Seeded `bahria-khi` |
| `organization_members` | In use; 1 super_admin typical |
| `organization_invitations` | **Table exists; app does not use** |
| `activity_logs` | Partial use |
| `call_logs` | Production data; open RLS |

### Edge Functions

None in repo. **Not required** for `generateLink` — use **service role on server** only.

### Tests

`npm run build` / `lint` only.

---

## 2. Gap analysis vs updated strategy

| Requirement | Current | Gap |
|-------------|---------|-----|
| No Google | Google login live | Remove in Phase 1 |
| Invite via `generateLink`, copy only | Resend / DB-only invite | Phase 3 API + UI |
| Set password on accept | N/A (Google) | Supabase invite redirect + app login |
| No public signup | Not enforced in dashboard | Operator disables in Supabase |
| Admin-assisted recovery | None | Phase 3 `generateLink` recovery |
| No Resend mandatory | Resend code path exists | Deprecate path; add `copy_only` adapter |
| vercel.app only | Supported via `VOCA_APP_URL` / `VERCEL_URL` | Set redirect URLs in Supabase |
| RLS + server RBAC | Open RLS; partial API roles | Phase 2 |
| Link security | N/A | No token logging; one-time UI; revocation model |

---

## 3. Reuse

- `organization_members`, handlers layout, Members UI shell, API guard pattern, Retell integration unchanged underneath.

---

## 4. Proposed schema/API (post-approval)

1. Use **`organization_invitations`:** `email`, `role`, `status` (`pending`/`accepted`/`revoked`/`expired`), `created_by`, `expires_at`, `accepted_at`, **`supabase_user_id` optional** — store **hash or id only**, not full invite URL.
2. New routes (preview):  
   - `POST /api/organization/invitations` → `{ copyLink }` once  
   - `POST /api/organization/invitations/:id/revoke`  
   - `POST /api/admin/members/:id/recovery-link` → `{ copyLink }` once  
3. RLS Phase 2: members read own org; super_admin policies for invites via server only.
4. **`server/lib/notificationDelivery.js`:** `copy_only` first.

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Leaked invite link | Short TTL, single-use, revoke, HTTPS only |
| Super admin lockout | Bootstrap via one admin `generateLink`; guard last super_admin |
| 401 on all APIs during rollout | Feature-flag guard or staging first |
| Voice AI broken | Webhook allowlist; smoke tests each phase |

---

## 6. Files likely touched (Phases 1–3)

- **Phase 1:** `Login.tsx`, `AuthContext.tsx`, remove Google; email/password; `auth.js` activate/me  
- **Phase 2:** migrations RLS; handler role matrix  
- **Phase 3:** `invites.js`, Members + copy-link modal; remove/ gate `email.js` Resend; `notificationDelivery.js`  
- **Docs:** deprecate `AUTH_SETUP.md` (Google/Resend-centric)

---

## 7. Operator checklist (no Resend)

1. Supabase: email provider on, **signups off**, redirect URLs for `vercel.app` + localhost.  
2. Vercel env: `SUPABASE_SERVICE_ROLE_KEY` (server), public URL/keys, `VOCA_APP_URL=https://….vercel.app`.  
3. Rotate secrets shared in chat before defense/production.

---

## 8. Connectivity evidence

| Check | Result |
|-------|--------|
| Supabase REST (publishable) | OK — org + members |
| Service role (local `.env`) | OK — admin client + `auth.admin.listUsers` (0 users at audit) |
| `generateLink` in production | **NOT RUN** (Phase 0) |
| Build | PASS (prior) |

---

## 9. Verdict

**Phase 0 complete** for revised strategy. **STOP** — await **Phase 1** approval.  
Full strategy: [`AUTH_AND_INVITE_STRATEGY.md`](./AUTH_AND_INVITE_STRATEGY.md).