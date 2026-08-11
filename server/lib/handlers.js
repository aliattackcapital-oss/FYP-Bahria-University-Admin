import { isSupabaseConfigured } from './supabase.js'
import {
  listCallLogs,
  mapCallToLog,
  persistCallLog,
  syncCallFromRemote,
  waitAndSyncCall,
} from './callSync.js'

function apiKey() {
  return process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
}

function agentId() {
  return process.env.RETELL_AGENT_ID?.trim()
}

export async function handleCreateWebCall(_req, res) {
  const key = apiKey()
  const agent = agentId()
  if (!key || !agent) {
    return res.status(500).json({
      error: 'Missing RETELL_API_KEY or RETELL_AGENT_ID.',
    })
  }

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agent }),
    })

    if (!response.ok) {
      const details = await response.text()
      return res.status(response.status).json({
        error: 'Failed to create web call',
        details,
      })
    }

    const call = await response.json()

    if (isSupabaseConfigured() && call.call_id) {
      try {
        await persistCallLog({
          id: call.call_id,
          name: 'Web caller',
          phone: '—',
          email: '—',
          enrollment: '—',
          duration_seconds: 0,
          started_at: new Date().toISOString(),
          summary: null,
          audio_url: null,
          transcript: [],
          call_status: 'ongoing',
          analyzed: false,
          raw_payload: { call_id: call.call_id, call_type: 'web_call' },
        })
      } catch (error) {
        console.warn('Pending call log insert failed:', error)
      }
    }

    return res.json({
      accessToken: call.access_token,
      callId: call.call_id,
    })
  } catch (error) {
    console.error('create-web-call error:', error)
    return res.status(500).json({ error: 'Unexpected error creating web call' })
  }
}

export async function handleListCallLogs(_req, res) {
  if (!isSupabaseConfigured()) {
    return res.status(200).json({ logs: [], configured: false })
  }
  try {
    const logs = await listCallLogs()
    return res.json({ logs, configured: true })
  } catch (error) {
    console.error('list call logs failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load call logs' })
  }
}

export async function handleRefreshCallLogs(_req, res) {
  const key = apiKey()
  if (!key) return res.status(500).json({ error: 'Missing RETELL_API_KEY.' })
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Supabase is not configured.' })
  }

  try {
    const existing = await listCallLogs()
    const logs = []
    for (const item of existing) {
      try {
        logs.push(await syncCallFromRemote(item.id, key))
      } catch (error) {
        console.warn('Refresh skipped for', item.id, error)
        logs.push(item)
      }
    }
    return res.json({ logs })
  } catch (error) {
    console.error('refresh call logs failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to refresh call logs' })
  }
}

export async function handleSyncCall(req, res) {
  const key = apiKey()
  if (!key) return res.status(500).json({ error: 'Missing RETELL_API_KEY.' })
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Supabase is not configured.' })
  }

  const callId = req.body?.callId || req.query?.callId
  if (!callId) return res.status(400).json({ error: 'callId is required' })

  try {
    const wait = req.body?.wait !== false
    const log = wait
      ? await waitAndSyncCall(callId, key)
      : await syncCallFromRemote(callId, key)
    return res.json({ log })
  } catch (error) {
    console.error('sync call failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to sync call' })
  }
}

export async function handleWebhook(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      accepts: ['call_analyzed', 'call_ended'],
      supabase: isSupabaseConfigured(),
    })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const event = body?.event
  const call = body?.call

  if (!event || !call?.call_id) {
    return res.status(400).json({ error: 'Expected { event, call }' })
  }

  console.log('Webhook received:', event, call.call_id)

  if (!isSupabaseConfigured()) {
    console.warn('Webhook received but Supabase is not configured')
    return res.status(204).end()
  }

  try {
    // call_analyzed is the source of truth for name, email, summary, transcript.
    // call_ended is stored too so a recording/duration still appears if analysis is delayed.
    if (event === 'call_analyzed' || event === 'call_ended') {
      await persistCallLog(mapCallToLog(call))
    }
    return res.status(204).end()
  } catch (error) {
    console.error('webhook persist failed:', error)
    return res.status(500).json({ error: 'Failed to store call' })
  }
}
