import { enforceMember } from './auth.js'

const PUBLIC_PATHS = new Set(['/api/health', '/api/webhook'])

export function isPublicApiPath(path) {
  return PUBLIC_PATHS.has(path)
}

export function isAuthApiPath(path) {
  return path === '/api/auth/me' || path === '/api/auth/activate'
}

export function isBootstrapPath(path) {
  return path === '/api/organization/bootstrap'
}

export async function expressApiGuard(req, res, next) {
  const path = req.path
  if (!path.startsWith('/api/')) return next()
  if (isPublicApiPath(path) || isAuthApiPath(path) || isBootstrapPath(path)) {
    return next()
  }

  const ctx = await enforceMember(req, res)
  if (!ctx) return
  req.auth = ctx
  return next()
}

export function withMemberAuth(handler, options = {}) {
  return async (req, res) => {
    const ctx = await enforceMember(req, res, options)
    if (!ctx) return
    req.auth = ctx
    return handler(req, res)
  }
}