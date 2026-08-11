# Project Brief — Bahria University Front Desk Portal

## Overview

Bahria University Front Desk Portal is a whitelabelled web dashboard built for a university FYP mid-defense demo. It presents a front-desk voice assistant named **Ali** that students and callers can talk to about admissions, fees, classes, transfers, and related university queries.

The product is framed as an institutional portal (not a third-party AI console). Branding, copy, and UI language stay focused on Bahria University and Ali.

## Goals

- Deliver a polished, defense-ready dashboard with clear visual credibility
- Demonstrate login-gated access, call analytics, live voice calling, and call-log review
- Keep the experience fully productized (university front desk), with no vendor branding in the UI
- Support local development and Vercel hosting with environment-based configuration

## Tech Stack

| Area | Choice |
| --- | --- |
| UI | React (Vite) + TypeScript |
| Styling | Tailwind CSS + shadcn-inspired component patterns |
| Routing | React Router |
| Charts | Recharts (sparklines on dashboard stats) |
| Voice calls | LiveKit Web SDK (browser mic/speakers → agent) |
| Local API | Express (`/api/create-web-call`, `/api/call-logs`, `/api/webhook`) |
| Hosting target | Vercel (SPA + serverless API routes) |
| Data store | Supabase (`call_logs` + `call-recordings` bucket) |
| Auth (demo) | Client-side credential check + `localStorage` |

## Screens

### 1. Login

- Centered sign-in card (email + password)
- Demo credential (client-side only):
  - Email: `admin@company.com`
  - Password: `password123`
- Successful login stores an auth flag and redirects to the Dashboard
- Protected routes redirect unauthenticated users back to Login
- Logout clears the auth flag

### 2. Dashboard

- Brand header: **Bahria University / Front Desk Portal** with a small institutional mark
- Three summary cards with 7-day sparkline charts:
  - Total Calls
  - Average Minutes per Call
  - Total Minutes Consumed
- Dashboard metrics use static mock data for a believable demo
- Primary action: **Talk to Ali**
  - Starts a live browser call to the voice agent
  - UI states: Idle → Connecting… → In Call (with timer) → Ended
  - Microphone permission is requested by the browser on first use

### 3. Call Logs

- Table columns: Name, Phone, Email, Date/Time, Duration
- Rows come from live completed calls stored in Supabase (no hardcoded dummy logs)
- After a call ends, the analyzed report is saved: recording, summary, and transcript
- Empty-state UI shows when no calls have been stored yet
- Clicking a row opens a right-side drawer with:
  - Caller details
  - Call summary
  - Audio player for the recording
  - Sentence-by-sentence transcript (Ali vs Caller)

## Voice Calling (LiveKit)

Talk to Ali uses a browser web-call flow:

1. User clicks **Talk to Ali**
2. Frontend requests a short-lived access token from `/api/create-web-call`
3. Server creates the web session using the configured agent ID (API key stays server-side)
4. Frontend connects through the LiveKit client SDK, streaming microphone audio and playing agent audio
5. User can end the call from the same button
6. When the call is analyzed, recording, summary, and transcript are stored in Supabase and shown on Call Logs

### Configuration

Local `.env` / Vercel environment variables:

```env
LIVEKIT_API_KEY=
LIVEKIT_AGENT_ID=
PORT=8787
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- Local: Express API on port `8787`, Vite proxies `/api`
- Vercel: serverless function at `api/create-web-call.js`

## Data & Types

Core call-log shape:

- `CallLog`: id, name, phone, email, duration, timestamp, audio URL, transcript
- `TranscriptLine`: speaker (`Ali` | `Caller`), text, timestamp seconds

Dashboard stats live in mock data. Call logs currently ship with sample university conversations for the defense demo and can later be replaced by a database.

## Folder Structure (high level)

```text
src/
  components/     # UI building blocks (stats, Talk to Ali, logs, drawer, brand)
  lib/            # auth, mock stats, call logs, LiveKit voice agent client
  pages/          # Login, Dashboard, Call Logs
  styles/         # theme + global CSS
api/              # Vercel serverless create-web-call endpoint
server/           # Local Express create-web-call endpoint
```

## Demo Credentials

| Field | Value |
| --- | --- |
| Email | `admin@company.com` |
| Password | `password123` |

## Local Run

```bash
npm install
npm run dev
```

- App: http://localhost:5173  
- Local call API: http://127.0.0.1:8787  

## Deployment Notes (Vercel)

1. Import the GitHub repository
2. Set environment variables for the LiveKit web-call API (`LIVEKIT_API_KEY`, `LIVEKIT_AGENT_ID`)
3. Deploy
4. Confirm Talk to Ali works over HTTPS (required for microphone access outside localhost)

## Current Scope / Non-Goals

**In scope for this milestone**

- Polished UI for defense
- Mock analytics + sample call logs
- Live Talk to Ali web calling
- Login gating suitable for demo

**Out of scope / later**

- Real database-backed call history
- Real recording playback URLs
- Production-grade authentication
- Multi-role admin permissions

## Repository

https://github.com/aliattackcapital-oss/FYP-Bahria-University-Admin
