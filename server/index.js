import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { dispatchApiRequest, expressApiMiddleware } from './lib/apiRouter.js'
import { isSupabaseConfigured } from './lib/supabase.js'

const app = express()
const port = Number(process.env.PORT || 8787)

app.use(cors({ origin: true }))
app.use(express.json({ limit: '8mb' }))

app.use(async (req, res, next) => {
  if (!req.path?.startsWith('/api')) return next()
  await expressApiMiddleware(req, res, next)
})

app.use((req, res, next) => {
  if (!req.path?.startsWith('/api')) return next()
  return dispatchApiRequest(req, res)
})

app.listen(port, () => {
  console.log(`Voice call API listening on http://127.0.0.1:${port}`)
  if (!process.env.RETELL_API_KEY || !process.env.RETELL_AGENT_ID) {
    console.warn('Warning: RETELL_API_KEY / RETELL_AGENT_ID not configured')
  }
  if (!isSupabaseConfigured()) {
    console.warn('Warning: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured')
  }
})