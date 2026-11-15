import { withMemberAuth } from '../server/lib/apiGuard.js'
import { handleGetOrganization } from '../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return handleGetOrganization(req, res)
})