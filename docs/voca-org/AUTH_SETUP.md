# Legacy: Google auth + Resend invites

> **Superseded by** [`AUTH_AND_INVITE_STRATEGY.md`](./AUTH_AND_INVITE_STRATEGY.md) (Supabase email/password, copy-link invites, no mandatory Resend).

# Google auth + invites (Phase 2/3) — outdated

## Supabase dashboard

1. **Authentication → Providers → Google** — enable; add Client ID/Secret from Google Cloud Console.
2. **Authentication → URL configuration**
   - Site URL: `https://<your-vercel-app>.vercel.app` (and `http://localhost:5173` for local)
   - Redirect URLs: `http://localhost:5173/**`, `https://<your-vercel-app>.vercel.app/**`
3. Optional: **Authentication → SMTP** if you prefer Supabase-native mail (app also supports Resend).

## Google Cloud Console

- OAuth client type **Web**
- Authorized JavaScript origins: `http://localhost:5173`, `https://<vercel-app>.vercel.app`
- Authorized redirect URIs: your Supabase callback URL (shown in Supabase Google provider settings)

## Environment variables

### Local `.env` and Vercel

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + server JWT verify |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (recommended) |
| `VOCA_APP_URL` | Production login link in invite emails |
| `RESEND_API_KEY` | Optional; sends invite emails |
| `RESEND_FROM` or `VOCA_INVITE_FROM` | From address (Resend verified domain) |
| `VOCA_ALLOWED_EMAIL_DOMAIN` | Optional comma list, e.g. `bahria.edu.pk` |

Vite reads `NEXT_PUBLIC_*` via `envPrefix` in `vite.config.ts`.

## First super admin + Google email

Bootstrap SQL may use `admin@company.com`. **Google sign-in must match a row in `organization_members.email`.**

Update in Supabase SQL:

```sql
update organization_members
set email = 'your.real@gmail.com'
where role = 'super_admin';
```

Or invite your Google email as a new member and promote via SQL.

## Invite flow

1. Super admin → **Members → Invite member** (role admin or front desk).
2. Server inserts `organization_members` (`invited`) and emails login link (if Resend configured).
3. Invitee signs in with **Google using that exact email**.
4. `POST /api/auth/activate` sets `active` and `auth_user_id`.

## APIs

| Route | Auth |
|-------|------|
| `GET /api/health`, `POST/GET /api/webhook` | Public |
| `POST /api/auth/activate`, `GET /api/auth/me` | Bearer session |
| All other `/api/*` | Active member |
| `POST /api/organization/members` | Super admin |
| `PATCH /api/organization/members` | Super admin |