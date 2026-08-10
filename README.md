# Bahria University Front Desk Portal

Vite + React dashboard for the FYP mid-defense demo, with live Talk to Sarah web calls.

## Local development

1. Copy `.env.example` to `.env` and fill in:
   - `RETELL_API_KEY`
   - `RETELL_AGENT_ID`
2. Install and run:

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- Local call API: http://127.0.0.1:8787

Demo login: `admin@company.com` / `password123`

## Vercel

1. Import this repo in Vercel.
2. Add environment variables:
   - `RETELL_API_KEY`
   - `RETELL_AGENT_ID`
3. Deploy. Web calls use the serverless function at `/api/create-web-call`.
