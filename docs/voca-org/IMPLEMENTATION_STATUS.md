# VOCA organization layer — implementation status

**Authority:** [`AUTH_AND_INVITE_STRATEGY.md`](./AUTH_AND_INVITE_STRATEGY.md) · **Final handoff:** [`FINAL_AUDIT_HANDOFF.md`](./FINAL_AUDIT_HANDOFF.md)

| Phase (handoff) | Component | Status | Evidence |
|-----------------|-----------|--------|----------|
| 0 | Repository audit (copy-link invite, no SMTP) | **PASS** | [`PHASE_0_ORG_AUTH_HANDOFF.md`](./PHASE_0_ORG_AUTH_HANDOFF.md) |
| 1 | Auth foundation (email/password) | **PASS** | Login, accept-invite, bootstrap `generateLink` |
| 2 | Membership + RBAC + RLS | **PASS** (after SQL) | `rbac.js`, migration `20261115190000_phase2_5_extensions.sql` |
| 3 | Invites via `generateLink` + copy link | **PASS** | Members invite + recovery dialogs |
| 3b | Optional SMTP/Resend (later) | **PASS** (optional) | `VOCA_INVITE_DELIVERY=resend` + `RESEND_API_KEY` |
| 4 | Call evaluations | **PASS** (after SQL) | `call_evaluations`, `CallEvaluationPanel` |
| 5 | Management dashboard | **PASS** | `ManagementOverview`, `/api/management-stats` |

**Production gate:** Supabase Auth settings + both migrations + Vercel env — **operator required** (see final handoff).

| FYP 4 | Call review queue (claim per call) | **PASS** | `call_review_tasks`, `/review-queue` UI |
| FYP 5+ | Review form depth, follow-ups, KB requests, E2E | **NOT_STARTED** | See plan doc |

Status values: `NOT_STARTED` | `IN_PROGRESS` | `PASS` | `BLOCKED`