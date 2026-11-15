import { isAuthApiPath, isBootstrapPath, isPublicApiPath } from './apiGuard.js'
import { enforceMember } from './auth.js'
import {
  handleAddKnowledgeSources,
  handleAuthActivate,
  handleAuthMe,
  handleBootstrapOrganization,
  handleCreateWebCall,
  handleDashboardStats,
  handleGetCallEvaluation,
  handleGetKnowledgeBase,
  handleGetOrganization,
  handleInviteOrganizationMember,
  handleListCallEvaluations,
  handleListCallLogs,
  handleListOrganizationInvitations,
  handleListOrganizationMembers,
  handleManagementStats,
  handleMemberRecoveryLink,
  handlePreviewSitemap,
  handleBackfillReviewQueue,
  handleClaimReviewTask,
  handleListReviewQueue,
  handleReassignReviewTask,
  handleRefreshCallLogs,
  handleRevokeOrganizationInvitation,
  handleStartReviewTask,
  handleSyncCall,
  handleUpdateOrganizationMember,
  handleUpsertCallEvaluation,
  handleWebhook,
} from './handlers.js'
import { healthPayload } from './health.js'

export function resolveApiPath(req) {
  if (req.path?.startsWith('/api/') || req.path === '/api') return req.path
  const raw = req.url || '/'
  const pathOnly = raw.split('?')[0] || '/'
  if (!pathOnly.startsWith('/')) return `/api${pathOnly}`
  return pathOnly
}

async function ensureAuth(req, res, path) {
  if (isPublicApiPath(path) || isAuthApiPath(path) || isBootstrapPath(path)) {
    return true
  }
  const ctx = await enforceMember(req, res)
  if (!ctx) return false
  req.auth = ctx
  return true
}

/**
 * Single entry for all /api/* routes (Vercel Hobby: one Serverless Function).
 */
export async function dispatchApiRequest(req, res) {
  const path = resolveApiPath(req)
  const method = (req.method || 'GET').toUpperCase()

  if (path === '/api/health' && method === 'GET') {
    return res.status(200).json(healthPayload())
  }

  if (!(await ensureAuth(req, res, path))) return

  if (path === '/api/auth/me' && method === 'GET') return handleAuthMe(req, res)
  if (path === '/api/auth/activate' && method === 'POST') return handleAuthActivate(req, res)

  if (path === '/api/organization' && method === 'GET') return handleGetOrganization(req, res)
  if (path === '/api/organization/bootstrap' && method === 'POST') {
    return handleBootstrapOrganization(req, res)
  }
  if (path === '/api/organization/members') {
    if (method === 'GET') return handleListOrganizationMembers(req, res)
    if (method === 'POST') return handleInviteOrganizationMember(req, res)
    if (method === 'PATCH') return handleUpdateOrganizationMember(req, res)
  }
  if (path === '/api/organization/members/recovery-link' && method === 'POST') {
    return handleMemberRecoveryLink(req, res)
  }
  if (path === '/api/organization/invitations') {
    if (method === 'GET') return handleListOrganizationInvitations(req, res)
    if (method === 'POST') return handleRevokeOrganizationInvitation(req, res)
  }

  if (path === '/api/create-web-call' && method === 'POST') return handleCreateWebCall(req, res)
  if (path === '/api/call-logs' && method === 'GET') return handleListCallLogs(req, res)
  if (path === '/api/dashboard-stats' && method === 'GET') return handleDashboardStats(req, res)
  if (path === '/api/management-stats' && method === 'GET') return handleManagementStats(req, res)

  if (path === '/api/call-evaluations') {
    if (method === 'GET') {
      const url = new URL(req.url, 'http://local')
      if (url.searchParams.get('list') === '1') return handleListCallEvaluations(req, res)
      return handleGetCallEvaluation(req, res)
    }
    if (method === 'POST') return handleUpsertCallEvaluation(req, res)
  }
  if (path === '/api/call-evaluations/list' && method === 'GET') {
    return handleListCallEvaluations(req, res)
  }

  if (path === '/api/review-queue' && method === 'GET') {
    return handleListReviewQueue(req, res)
  }
  if (path === '/api/review-queue/claim' && method === 'POST') {
    return handleClaimReviewTask(req, res)
  }
  if (path === '/api/review-queue/start' && method === 'POST') {
    return handleStartReviewTask(req, res)
  }
  if (path === '/api/review-queue/reassign' && method === 'POST') {
    return handleReassignReviewTask(req, res)
  }
  if (path === '/api/review-queue/backfill' && method === 'POST') {
    return handleBackfillReviewQueue(req, res)
  }

  if (path === '/api/knowledge-base') {
    if (method === 'GET') return handleGetKnowledgeBase(req, res)
    if (method === 'POST') return handleAddKnowledgeSources(req, res)
  }
  if (path === '/api/knowledge-base/sitemap') {
    if (method === 'GET' || method === 'POST') return handlePreviewSitemap(req, res)
  }

  if (path === '/api/sync-call' && method === 'POST') return handleSyncCall(req, res)
  if (path === '/api/refresh-call-logs' && method === 'POST') return handleRefreshCallLogs(req, res)

  if (path === '/api/webhook' && (method === 'GET' || method === 'POST')) {
    return handleWebhook(req, res)
  }

  return res.status(404).json({ error: 'Not found', path, method })
}

/** Express middleware-style guard (keeps parity with prior expressApiGuard). */
export async function expressApiMiddleware(req, res, next) {
  const path = resolveApiPath(req)
  if (!path.startsWith('/api/') && path !== '/api') return next()
  if (isPublicApiPath(path) || isAuthApiPath(path) || isBootstrapPath(path)) {
    return next()
  }
  const ctx = await enforceMember(req, res)
  if (!ctx) return
  req.auth = ctx
  return next()
}