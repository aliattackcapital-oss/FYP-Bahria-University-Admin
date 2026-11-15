# VOCA — Authentication & invitation strategy (approved direction)

**Status:** Phases 1–5 implemented in repo — **run migrations + Supabase Auth before production** (see [`FINAL_AUDIT_HANDOFF.md`](./FINAL_AUDIT_HANDOFF.md))  
**Hosting:** Existing `*.vercel.app` URL (no custom domain purchase)  
**Auth provider:** Supabase Auth only (no Google, Clerk, Firebase, etc.)

---

## Product decisions

| # | Decision |
|---|----------|
| 1 | No Google OAuth or Google Cloud Console |
| 2 | No paid domain or custom DNS required |
| 3 | **No mandatory Resend** (or any SMTP) at this stage |
| 4 | Super Admin creates staff invitations **inside VOCA** |
| 5 | Server uses Supabase Admin **`auth.admin.generateLink({ type: 'invite', email, ... })`** — **do not** rely on Supabase to send email |
| 6 | Super Admin gets **Copy invitation link** in UI (one-time display; treat as secret) |
| 7 | Invitee opens link → **set password** → session; membership activated only after server validation |
| 8 | Roles enforced via **trusted DB** (`organization_members`) + **server checks** + **RLS** (phased) |
| 9 | **Public registration disabled** in Supabase Auth |
| 10 | **Password recovery:** admin-assisted **`generateLink({ type: 'recovery' })`** + copy link + optional extra verification until email delivery exists |

---

## Security requirements (implementation must satisfy)

- Invitation/recovery links are **bearer secrets** — only **super_admin** can generate; never log full URLs or tokens.
- **Do not** treat “has link” as proof of email ownership — redemption must go through Supabase Auth + **matching invited email** on `organization_members`.
- Support **expiration**, **one-time use** (Supabase defaults), **revocation** (mark invite row revoked; optionally invalidate user if not yet confirmed).
- **No active membership** until: Auth user exists/confirmed, email matches pending invite, server sets `status = active` and `auth_user_id`.
- **No** temp passwords in chat or logs; **no** service role in browser.
- Recovery links: short-lived, super-admin generated, deliver through secure channel (in person / official channel), not public paste.

---

## Invitation flow (target)

```text
Super Admin (VOCA)
  → POST /api/organization/invitations (super_admin only)
  → Server: insert organization_invitations + organization_members (invited)
  → Server: supabase.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: VOCA_APP_URL } })
  → Response: { invitationId, copyLinkOnce }  // link shown once in UI; not stored plaintext in DB

Invitee
  → Opens link (Supabase hosted or app redirect)
  → Sets password
  → Redirect to VOCA login/app
  → POST /api/auth/activate (session JWT)
  → Server: verify auth.users.email === organization_members.email, status invited → active, set auth_user_id
```

**Revoke:** super_admin marks invitation/member `revoked`/`suspended`; optionally delete unconfirmed Auth user via Admin API.

**Resend (no email):** new `generateLink` → new copy link; invalidate prior invite record in app DB.

---

## Password recovery (interim, no SMTP)

```text
Super Admin verifies identity (out of band)
  → POST /api/admin/recovery-link { memberId }  // super_admin only
  → generateLink({ type: 'recovery', email })
  → Copy link once → hand to staff securely
```

Future: same abstraction can call email provider instead of returning link to UI.

---

## Email delivery abstraction (future)

Introduce `server/lib/notificationDelivery.js` (or similar) with:

```text
deliverInvite({ email, inviteLink }) → 'copy_only' | 'smtp' | 'resend'
```

Phase 3 implements **`copy_only`**. Later phases plug Resend/Supabase SMTP without changing invite orchestration.

---

## Roles (unchanged intent)

| Role | Implement now | Notes |
|------|----------------|-------|
| `super_admin` | Yes | Invites, recovery links, member CRUD, KB (per policy) |
| `front_desk` | Yes | Calls, evaluations (later), no member/KB admin |
| `supervisor` | Design only | Enum reserved in Phase 2; no UI until defined |
| `admin` (legacy enum) | Migrate | Map to `supervisor` or deprecate in migration |

---

## Supabase dashboard (manual, before Phase 1 go-live)

1. **Authentication → Providers:** Email on; **disable** Google if enabled.
2. **Authentication → URL configuration:** Site URL = `https://<project>.vercel.app` and `http://localhost:5173`; redirect URLs `/**` for both.
3. **Authentication → Settings:** **Disable sign ups** (invite-only).
4. **No SMTP configuration required** for current strategy.

---

## What the repo has today (gap)

| Area | Current | Target |
|------|---------|--------|
| Login | Google OAuth | Email/password + invite acceptance |
| Invite | DB row + optional Resend HTTP | `generateLink` + copy link |
| Recovery | None | Admin `generateLink` recovery |
| Service role | Local `.env` (operator) | Vercel server env only |
| RLS | Open demo policies | Member-scoped (Phase 2) |

**Do not change production Auth settings until Phase 1 is approved and tested on staging.**

---

## Revised implementation phases

| Phase | Scope |
|-------|--------|
| **0** | Audit + this strategy doc ✅ |
| **1** | Email/password login, session, protected routes, sign-out; remove Google UI; bootstrap first super_admin via admin-generated invite link |
| **2** | RBAC + RLS; role checks on all sensitive APIs; preserve webhook/public health |
| **3** | Invitation API + Members UI (copy link, revoke, list pending); notification adapter `copy_only` |
| **3b** (optional later) | SMTP/Resend behind same adapter |
| **4** | Call evaluations |
| **5** | Management dashboard |

---

## Phase 0 completion (this update)

- Strategy document added/updated.
- No application code, migrations, or Supabase Auth dashboard changes performed.
- Service role available locally for **future** server-side `generateLink` (not invoked in this phase).