import { withMemberAuth } from '../server/lib/apiGuard.js'
import { handleListCallLogs } from '../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return handleListCallLogs(req, res)
})