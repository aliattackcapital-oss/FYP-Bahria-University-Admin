import { withMemberAuth } from '../server/lib/apiGuard.js'
import {
  handleGetCallEvaluation,
  handleListCallEvaluations,
  handleUpsertCallEvaluation,
} from '../server/lib/handlers.js'

export default withMemberAuth(async function handler(req, res) {
  if (req.method === 'GET') {
    if (req.query?.list === '1') return handleListCallEvaluations(req, res)
    return handleGetCallEvaluation(req, res)
  }
  if (req.method === 'POST') return handleUpsertCallEvaluation(req, res)
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
})