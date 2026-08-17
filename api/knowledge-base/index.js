import {
  handleAddKnowledgeSources,
  handleGetKnowledgeBase,
} from '../../server/lib/handlers.js'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb',
  },
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGetKnowledgeBase(req, res)
  if (req.method === 'POST') return handleAddKnowledgeSources(req, res)
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
