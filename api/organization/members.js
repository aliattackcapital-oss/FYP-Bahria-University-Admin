import { withMemberAuth } from '../../server/lib/apiGuard.js'
import {
  handleInviteOrganizationMember,
  handleListOrganizationMembers,
  handleUpdateOrganizationMember,
} from '../../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method === 'GET') return handleListOrganizationMembers(req, res)
  if (req.method === 'POST') return handleInviteOrganizationMember(req, res)
  if (req.method === 'PATCH') return handleUpdateOrganizationMember(req, res)
  res.setHeader('Allow', 'GET, POST, PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
})