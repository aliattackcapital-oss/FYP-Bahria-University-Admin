import { withMemberAuth } from '../server/lib/apiGuard.js'
import { handleSyncCall } from '../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return handleSyncCall(req, res)
})