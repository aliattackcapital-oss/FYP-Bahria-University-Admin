/**
 * Vercel serverless endpoint for web-call access tokens.
 * Set RETELL_API_KEY and RETELL_AGENT_ID in the Vercel project env vars.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
  const agentId = process.env.RETELL_AGENT_ID?.trim()

  if (!apiKey || !agentId) {
    return res.status(500).json({
      error:
        'Missing RETELL_API_KEY or RETELL_AGENT_ID. Configure them in Vercel project settings.',
    })
  }

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agentId }),
    })

    if (!response.ok) {
      const details = await response.text()
      return res.status(response.status).json({
        error: 'Failed to create web call',
        details,
      })
    }

    const call = await response.json()
    return res.status(200).json({
      accessToken: call.access_token,
      callId: call.call_id,
    })
  } catch {
    return res.status(500).json({ error: 'Unexpected error creating web call' })
  }
}
