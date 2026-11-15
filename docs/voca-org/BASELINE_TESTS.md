# Baseline tests — Phase 0

**Recorded:** 15 November 2026  
**Environment:** local workspace audit (no production credentials recorded)

## Automated scripts available

| Script | Purpose |
|--------|---------|
| `npm run build` | `tsc -b` + Vite production bundle |
| `npm run lint` | `oxlint` on TypeScript/TSX |
| `npm run dev` | Express API + Vite dev (not a test) |
| `npm run preview` | Serves `dist/` (requires API for `/api`) |

**Not present:** `npm test`, Vitest/Jest, Playwright/Cypress, API integration tests, RLS test harness, webhook signature tests.

## Phase 0 execution results

### `npm run build`

- **Result:** PASS (exit 0)
- **Tooling:** TypeScript ~6.0.2, Vite 8.2.1
- **Output:** `dist/index.html`, CSS ~56 KB gzip ~10 KB, JS ~1.21 MB gzip ~344 KB
- **Notes:** Chunk size warning (>500 KB) for main bundle; no type errors

### `npm run lint`

- **Result:** PASS (exit 0, warnings only)
- **Warnings:** `react(only-export-components)` in `src/components/ui/badge.tsx`, `src/components/ui/button.tsx`

## Manual / smoke tests (documented, not run in Phase 0 gate)

| Flow | Last known state (prior sessions) | Phase 0 verification |
|------|-------------------------------------|----------------------|
| Retell v3 web call | Migrated from v2; `create-web-call` returns gateway fields | NOT_VERIFIED this session |
| KB list | Retell `get-knowledge-base`; retries via `retellFetch` | NOT_VERIFIED this session |
| Webhook → Supabase | Handler in `handleWebhook`; no signature check | Code inspection only |
| Express ↔ Vercel parity | All `api/*.js` import `server/lib/handlers.js` | PASS (static review) |

## Recommended baseline before Phase 1+

1. Add `npm test` with at least handler-level tests (auth middleware stubs).
2. Document fixed smoke checklist: health, create-web-call (staging key), list call logs, GET KB (read-only).
3. Optional: second Supabase project for migration/RLS experiments (see `IMPLEMENTATION_DECISIONS.md`).