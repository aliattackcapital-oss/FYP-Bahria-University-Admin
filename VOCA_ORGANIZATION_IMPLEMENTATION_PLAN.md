# VOCA — Organization Layer: Cursor Implementation Plan

**Project:** Bahria University Karachi / VOCA Final Year Project  
**Status:** Planning only — no application, database, Retell, or Vercel changes authorized  
**Plan date:** 15 November 2026

## 1. Goal and existing system

Turn the existing one-account VOCA dashboard into a real organization-level system with secure staff access, human review of every call, follow-up tracking, staff accountability, and controlled knowledge-base improvements.

**Existing architecture to preserve:** React 19 + TypeScript + Vite + Tailwind frontend; Express locally and shared Vercel serverless API handlers; Retell v3 web calling and knowledge base; Supabase `call_logs` and recordings. The present `admin@company.com / password123` localStorage login is demo-only and must eventually be replaced. The existing Members UI is mock data. Do not break live browser calls, webhook processing, recordings, knowledge-base listing, or call analytics.

This is a **single-university FYP** for now. Design data ownership so additional organizations are possible later, but do not build multi-tenant registration, billing, or SaaS onboarding.

## 2. Decisions for the initial design

- **Roles:** `super_admin`, `admin`, `front_desk`.
- **Super Admin:** manage members/roles, inspect team-wide KPIs and activity, view all calls and reviews, manage KB, manage review assignments.
- **Admin:** review all calls, assign reviews, manage follow-up cases and KB, view team activity; cannot grant roles or manage members.
- **Front Desk Officer:** review calls, claim pending reviews, flag issues, write improvement suggestions, handle assigned follow-ups; cannot change KB or manage users.
- **Review requirement:** Every completed call gets exactly one review task. Human review can be lightweight (quick approval) or detailed (issues and recommendations).
- **Statuses must remain distinct:** evaluation verdict (`correct`, `partially_correct`, `incorrect`, `unable_to_assess`); review workflow (`processing`, `unassigned`, `assigned`, `in_review`, `completed`); separate follow-up case workflow (`open`, `in_progress`, `resolved`, `dismissed`). A correctly handled AI call may still require follow-up.
- **Queue:** Front Desk Officers claim calls from a shared unassigned queue; claim must be atomic; admins can reassign.
- **Knowledge-base changes:** Front desk suggests improvements; Admin/Super Admin approves and publishes. No automatic AI edits to Retell knowledge base.
- **Authentication:** Supabase Auth with Google sign-in, restricted to approved organization members. Signing into Google is not sufficient to receive access.
- **Data privacy:** protect call recordings, transcript text, caller contact details, and Retell/Supabase secrets.

## 3. Working agreement for Cursor

**Share this complete plan ONCE as permanent context, then assign Cursor ONLY ONE phase at a time.** The plan is not permission to implement everything.

For each phase:
1. Read this plan and inspect the actual repository before changing code. Report any differences from these assumptions.
2. Describe exact files, schema changes, tests, rollback plan, and any manual operator steps.
3. Work in a dedicated branch; make small, reviewable commits.
4. Use local/test/staging credentials and data. Do **not** modify live Supabase, Retell agent, Retell KB, or production Vercel without explicit permission.
5. Preserve parity between local Express handlers and Vercel API handlers.
6. Run relevant unit/integration/authorization tests and `npm run build`; smoke-test existing Retell flows when feasible.
7. Report actual evidence and limitations, not assumed success.
8. **STOP after the approved phase.** Never begin the next phase automatically.

Track phase statuses in `docs/voca-org/IMPLEMENTATION_STATUS.md` (`NOT_STARTED`, `IN_PROGRESS`, `PASS`, `BLOCKED`). Mark PASS only after tests and acceptance checks succeed.

## 4. Implementation phases and gates

| Phase | Component | Deliverable / acceptance gate |
|---|---|---|
| **0** | Read-only audit | Inspect repo, Supabase schema/RLS, auth, endpoints, storage, testing, webhook verification. Record build baseline and risks. **No changes to services or app.** |
| **1** | Organization foundation | Add organizations, memberships/roles, membership status, audit events, safe initial Super Admin bootstrap and RLS; test unauthorized access and role escalation. |
| **2** | Google authentication **and real API security** | Replace localStorage demo login; restrict all protected endpoints server-side; secure recording access; preserve verified Retell webhook. Test anonymous, unapproved, suspended, Front Desk, Admin, and Super Admin accounts. |
| **3** | Team & Access | Real members directory, preapprove/invite, change role, suspend/reactivate/remove. Prevent loss of last Super Admin; preserve audit history. |
| **4** | Call review queue | Create idempotent one-task-per-call workflow from Retell sync/webhooks; processing state; atomic claim; admin reassignment; safe historic backfill. |
| **5** | Human evaluation form | Fast correct/partial/incorrect/unable verdict; optional issue reasons and suggestions; reviewer attribution, timestamps, save/reopen, audited corrections. |
| **6** | Flags & follow-up cases | Urgent/high/normal priority, assigned ownership, separate open/in-progress/resolved/dismissed lifecycle, notes and activity trail. |
| **7** | Organizational KPIs | Review coverage, correctness (with denominators), pending reviews, urgent cases, review time, individual staff activity, date filters; role restrictions and SQL reconciliation. |
| **8** | KB improvement requests | Front Desk submits transcript-backed issue; admin approves/rejects; controlled Retell KB update and separate manual verification; full audit. |
| **9** | Defense-ready integration | Full cross-role E2E demo, negative authorization tests, duplicate webhook/race tests, Retell regression, privacy/security checks, README/docs and presentation evidence. |

### Phase 0 — exact starting task (READ ONLY)

- Inspect repository structure, local/prod handlers, auth logic, demo credentials, current Members UI, Supabase tables and policies, storage visibility, Retell webhook, call sync and knowledge-base API.
- Verify test scripts and baseline `npm run build` results. Don't expose environment values.
- Document security risks (especially permissive RLS, public call recordings, API endpoints without authorization).
- Propose schema, safe isolated testing resources, and rollback for Phase 1 based on *actual* code.
- Outputs: `PHASE_0_AUDIT.md`, `BASELINE_TESTS.md`, `IMPLEMENTATION_DECISIONS.md`, and a Phase 1 schema proposal.
- Do not implement auth, create SQL tables, deploy, or modify Retell/Vercel/Supabase during this phase.

### Phase 1 — organization schema

Suggested starting tables: `organizations`, `organization_members` (`organization_id`, `auth_user_id`, `email`, `display_name`, `role`, `status`), `activity_logs`. Optional approved-email invitation records. Start with one seeded Bahria organization and an explicitly approved initial Super Admin identity. Restrict writes via RLS/server authorization; no public self-registration into a role. Test uniqueness, permission boundaries, bootstrap and existing call-log integrity.

### Phase 2 — auth and backend enforcement (security gate)

Use Supabase Google OAuth and server-side membership checks. Replace the demo login, gate routes and **every sensitive API handler**, including call logs, audio, transcripts, knowledge-base mutations, analytics and call sync. Keep the externally invoked Retell webhook separate and verify its authenticity. Make call recordings private and serve short-lived signed URLs to authorized users, with migration/backward compatibility checks. Prevent a forged user role or a stale session from granting privileges. Test every role against both allowed and forbidden endpoints. Do not deploy before this gate passes.

### Phase 3 — member lifecycle

Super Admin invites/preapproves staff emails, changes role, suspends, reactivates, removes. Google identity must match an approved membership. A suspended user loses access even if a previous browser session exists. Never delete historical reviews merely because a member is removed. Prevent demoting/removing the last active Super Admin.

### Phase 4 — review queue

Create `call_review_tasks` with `call_id` UNIQUE and processing/assignment/completion statuses. New completed Retell calls must produce exactly one task after sync/webhook; repeated webhook deliveries must not duplicate it. Preserve processing state for incomplete analysis. Shared queue with atomic claim: concurrent claims produce exactly one winner. Allow safe backfill of old call logs.

### Phase 5 — review form

Create `call_reviews` with reviewer, task, verdict, optional issue categories, suggestions and timestamps. Fast approve for good calls; additional fields shown on partial/incorrect or flagged calls. A reviewer cannot impersonate another. Corrections must be tracked in immutable activity history. Save and reload must preserve state.

### Phase 6 — follow-up cases

Create `follow_up_cases` with call reference, optional review reference, assigned member, priority, status, reason, resolution notes and timestamps. Keep case status independent from verdict. Urgent cases are prominent. Never mark caller contacted merely because an assignment was created.

### Phase 7 — analytics

Use persisted DB data only. Show pending/reviewed rates, verdict distribution, staff reviews/turnaround, unresolved cases and overdue urgent cases. Each percentage needs its denominator and date range. Front Desk sees personal workload; admins see organization-wide activity. Test reconciliation against SQL fixture counts.

### Phase 8 — controlled improvement loop

Front Desk can create `kb_change_requests` with source call, transcript excerpt, alleged wrong answer and recommended correction. Admin approves or rejects. Changes to Retell KB occur only through approved privileged action; preserve audit and source version where possible. Mark verified only after an actual follow-up test, not simply successful API response.

### Phase 9 — final acceptance

Run an end-to-end flow with at least four test users: Super Admin, Admin and two Front Desk Officers. Make a real/controlled Retell web call, sync it, claim/review it, flag a case, inspect admin KPIs and submit a KB correction request. Verify role restrictions, recording privacy, idempotency, build and failure recovery. Document known limits for FYP defense.

## 5. Required completion report template

```
PHASE:
STATUS: PASS | BLOCKED
BRANCH / COMMIT:
FILES CHANGED:
MIGRATIONS:
IMPLEMENTED BEHAVIOR:
TESTS RUN AND ACTUAL RESULTS:
SECURITY / RLS / ROLE CHECKS:
VERCEL / EXPRESS PARITY:
RETELL + CALL LOG REGRESSION:
OPERATOR SETUP REQUIRED:
KNOWN LIMITATIONS:
ROLLBACK PLAN:
NEXT PHASE: NOT STARTED
```

Never report PASS for tests not executed; instead note `NOT VERIFIED` or `BLOCKED`.

## 6. First Cursor message (copy/paste)

Read `docs/voca-org/VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md` as the permanent project requirements and sequencing reference. **Execute Phase 0 only. READ-ONLY.** Inspect the actual repository, API/auth/Retell integrations, Supabase schema/RLS/storage security and available tests. Document the baseline and security gaps, identify dependencies for Supabase Google OAuth, and propose a safe Phase 1 schema and isolated test plan. Do not change application code, migrations, database contents, Retell settings, Vercel settings, or production resources. Return the Phase 0 completion report in the required format and STOP for my approval.

## 7. Later Cursor phase message (copy/paste only when ready)

Read `docs/voca-org/VOCA_ORGANIZATION_IMPLEMENTATION_PLAN.md` and `docs/voca-org/IMPLEMENTATION_STATUS.md`. I authorize **Phase [NUMBER] only**, subject to using an isolated test environment. Verify the previous phase is PASS, inspect the relevant current implementation, state exact file/schema changes, test and rollback plan, then implement the approved phase only. Run the stated acceptance gate and regressions, report actual test evidence and blocked items, and STOP. Do not start the next phase or alter production resources without explicit approval.

## 8. Why not one giant implementation prompt?

Cursor should have the **whole vision as reference** but receive **one phase's execution instructions at a time**. Giving the whole plan with a vague command to 'implement everything' encourages scope drift, makes schema changes hard to audit, and can hide failed tests. Keep the plan file in the repo and track phase-by-phase evidence. Split an unexpectedly large phase into subphases before editing.
