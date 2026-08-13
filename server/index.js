import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { handleCreateWebCall, handleDashboardStats, handleListCallLogs, handleRefreshCallLogs, handleSyncCall, handleWebhook } from './lib/handlers.js'
import { isSupabaseConfigured } from './lib/supabase.js'

const app = express()
const port = Number(process.env.PORT || 8787)

app.use(cors({ origin: true }))
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(
      process.env.RETELL_API_KEY?.trim() && process.env.RETELL_AGENT_ID?.trim(),
    ),
    supabase: isSupabaseConfigured(),
  })
})

app.post('/api/create-web-call', (req, res) => handleCreateWebCall(req, res))
app.get('/api/call-logs', (req, res) => handleListCallLogs(req, res))
app.get('/api/dashboard-stats', (req, res) => handleDashboardStats(req, res))
app.post('/api/sync-call', (req, res) => handleSyncCall(req, res))
app.post('/api/refresh-call-logs', (req, res) => handleRefreshCallLogs(req, res))
app.get('/api/webhook', (req, res) => handleWebhook(req, res))
app.post('/api/webhook', (req, res) => handleWebhook(req, res))

app.listen(port, () => {
  console.log(`Voice call API listening on http://127.0.0.1:${port}`)
  if (!process.env.RETELL_API_KEY || !process.env.RETELL_AGENT_ID) {
    console.warn('Warning: RETELL_API_KEY / RETELL_AGENT_ID not configured')
  }
  if (!isSupabaseConfigured()) {
    console.warn('Warning: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured')
  }
})
