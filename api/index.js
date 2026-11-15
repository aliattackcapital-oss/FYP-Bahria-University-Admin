import { dispatchApiRequest } from '../server/lib/apiRouter.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

export default function handler(req, res) {
  return dispatchApiRequest(req, res)
}