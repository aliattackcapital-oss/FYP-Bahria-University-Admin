# Phase 1 operator steps (email / password auth)

**Authority:** [`AUTH_AND_INVITE_STRATEGY.md`](./AUTH_AND_INVITE_STRATEGY.md)

## 1. Apply migration

In the Supabase SQL editor, run:

`supabase/migrations/20261115180000_organizations.sql`

Rollback (staging only): `20261115180000_organizations_rollback.sql`

## 2. Supabase Auth dashboard (before go-live)

1. **Authentication → Providers:** Email on; disable Google.
2. **Authentication → URL configuration:** Site URL = your `https://*.vercel.app` and `http://localhost:5173`; redirect URLs include `/**` for both.
3. **Authentication → Settings:** **Disable sign ups** (invite-only).
4. SMTP optional — not required for copy-link invites.

## 3. Environment

Add to `.env` and **Vercel** (server-only for service role):

- `VOCA_ORG_SLUG=bahria-khi` (default)
- `VOCA_BOOTSTRAP_SUPER_ADMIN_EMAIL=` your super admin email
- `SUPABASE_SERVICE_ROLE_KEY=` (required for invite links)
- `VOCA_APP_URL=` `http://localhost:5173` locally, or your Vercel URL in production

Client (Vite) also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_*`).

## 4. Bootstrap Super Admin (once)

Start the API (`npm run dev` or server on port 8787), then:

```bash
npm run org:bootstrap
```

Or `POST /api/organization/bootstrap` with `{ "email": "you@bahria.edu.pk" }`.

- Creates `organization_members` row (`super_admin`, **invited**).
- Returns **`copyLinkOnce`** — open it once in a browser to set your password (treat as secret).

Fails with **409** if an **active** `super_admin` already exists.

## 5. First login

1. Open the bootstrap invite link → **Accept invitation** → set password.
2. Or use **Sign in** with email + password after the invite is accepted.

## 6. Verify

```bash
npm run org:smoke
```

- `GET /api/organization` → `schemaReady: true`, Bahria org
- After session: `GET /api/auth/me` with Bearer token → active super_admin

## 7. UI

Protected routes require an **active** member. **Sign out** is in the app shell.