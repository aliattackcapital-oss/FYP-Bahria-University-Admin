/** Trusted server-side role gates (Supabase RLS still denied for anon/auth clients). */

export const ALL_ROLES = ['super_admin', 'admin', 'front_desk']

export const PERMS = {
  CALLS_READ: ALL_ROLES,
  CALLS_SYNC: ['super_admin', 'admin', 'front_desk'],
  WEB_CALL: ALL_ROLES,
  DASHBOARD: ALL_ROLES,
  KB_READ: ['super_admin', 'admin'],
  KB_WRITE: ['super_admin', 'admin'],
  KB_SITEMAP: ['super_admin', 'admin'],
  AGENT_PROMPT: ['super_admin', 'admin'],
  MEMBERS_VIEW: ['super_admin', 'admin', 'front_desk'],
  MEMBERS_MANAGE: ['super_admin'],
  INVITATIONS: ['super_admin'],
  EVALUATIONS_READ: ['super_admin', 'admin'],
  EVALUATIONS_WRITE: ['front_desk'],
  EVALUATION_GET: ['super_admin', 'admin', 'front_desk'],
  FLAGGED_CALLS: ['super_admin'],
  ACTIVITY_LOGS: ['super_admin'],
  MANAGEMENT_STATS: ['super_admin', 'admin'],
  REVIEW_QUEUE: ['front_desk'],
  CALL_DETAIL: ALL_ROLES,
  CALL_DETAIL_REVIEW: ['front_desk'],
  REVIEW_QUEUE_ASSIGN: ['super_admin', 'admin'],
  REVIEW_BACKFILL: ['super_admin', 'admin'],
  PLATFORM_ORGANIZATIONS: ['platform'],
}

export function memberHasRole(member, allowed) {
  if (!member?.role) return false
  return allowed.includes(member.role)
}

export function forbidUnlessRole(req, res, allowed) {
  const role = req.auth?.member?.role
  if (!role || !allowed.includes(role)) {
    res.status(403).json({ error: 'Insufficient permissions.' })
    return false
  }
  return true
}