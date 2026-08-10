import 'dotenv/config'
import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT || 8787)

const apiKey = process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
const agentId = process.env.RETELL_AGENT_ID?.trim()

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(apiKey && agentId),
  })
})

/**
 * Creates a one-time web-call access token.
 * API key stays on the server — never expose it to the browser.
 * @see https://docs.retellai.com/deploy/web-call
 */
app.post('/api/create-web-call', async (_req, res) => {
  if (!apiKey || !agentId) {
    return res.status(500).json({
      error:
        'Missing RETELL_API_KEY or RETELL_AGENT_ID. Add them to the project .env file.',
    })
  }

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('create-web-call failed:', response.status, details)
      return res.status(response.status).json({
        error: 'Failed to create web call',
        details,
      })
    }

    const call = await response.json()
    return res.json({
      accessToken: call.access_token,
      callId: call.call_id,
    })
  } catch (error) {
    console.error('create-web-call error:', error)
    return res.status(500).json({ error: 'Unexpected error creating web call' })
  }
})

app.listen(port, () => {
  console.log(`Voice call API listening on http://127.0.0.1:${port}`)
  if (!apiKey || !agentId) {
    console.warn('Warning: RETELL_API_KEY / RETELL_AGENT_ID not configured')
  }
})
