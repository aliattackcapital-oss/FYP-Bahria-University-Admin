import { withMemberAuth } from '../../server/lib/apiGuard.js'
import {
  handleListOrganizationInvitations,
  handleRevokeOrganizationInvitation,
} from '../../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method === 'GET') return handleListOrganizationInvitations(req, res)
  if (req.method === 'POST') return handleRevokeOrganizationInvitation(req, res)
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
})