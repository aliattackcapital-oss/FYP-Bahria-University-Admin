import { withMemberAuth } from '../../server/lib/apiGuard.js'
import { handlePreviewSitemap } from '../../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return handlePreviewSitemap(req, res)
})