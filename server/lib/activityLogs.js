import { getSupabaseAdmin } from './supabase.js'

/** Super-admin activity feed: completed evaluations by front desk only. */
export const FRONT_DESK_VISIBLE_ACTIONS = new Set(['call.evaluated'])

function isMissingTable(error) {
  const msg = `${error?.message ?? ''}`.toLowerCase()
  return msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function activityLogsSchemaReady() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  const { error } = await supabase
    .from('activity_logs')
    .select('id', { head: true, count: 'exact' })
    .limit(1)
  if (error && isMissingTable(error)) return false
  return !error
}

export async function listActivityLogs(organizationId, { limit = 150, frontDeskOnly = false } = {}) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      `
      id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at,
      actor_member_id,
      organization_members:actor_member_id (
        id,
        display_name,
        email,
        role
      )
    `,
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 300))
  if (error) throw error

  let rows = data ?? []
  if (frontDeskOnly) {
    rows = rows.filter(
      (row) =>
        row.organization_members?.role === 'front_desk' &&
        FRONT_DESK_VISIBLE_ACTIONS.has(row.action),
    )
  }
  return rows.map(mapActivityRow)
}

function mapActivityRow(row) {
  const actor = row.organization_members
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    actor: actor
      ? {
          id: actor.id,
          name: actor.display_name || actor.email,
          email: actor.email,
          role: actor.role,
        }
      : null,
  }
}