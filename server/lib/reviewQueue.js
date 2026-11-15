import { getOrganizationBySlug } from './organization.js'
import { getSupabaseAdmin } from './supabase.js'

function isMissingTable(error) {
  const msg = `${error?.message ?? ''}`.toLowerCase()
  return msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function reviewQueueSchemaReady() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  const { error } = await supabase.from('call_review_tasks').select('id', { head: true, count: 'exact' }).limit(1)
  if (error && isMissingTable(error)) return false
  return !error
}

export function callReadyForReview(row) {
  if (!row) return false
  if (row.analyzed) return true
  const status = String(row.call_status ?? row.raw_payload?.call_status ?? '').toLowerCase()
  if (status === 'ended' || status === 'error') return true
  if ((row.duration_seconds ?? 0) > 0) return true
  return false
}

export async function ensureReviewTaskForCall(callId, logRow = null) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { organization, schemaReady } = await getOrganizationBySlug()
  if (!schemaReady || !organization) return null

  const ready = callReadyForReview(logRow)
  const now = new Date().toISOString()

  const { data: existing, error: fetchError } = await supabase
    .from('call_review_tasks')
    .select('id, status')
    .eq('call_id', callId)
    .maybeSingle()

  if (fetchError) {
    if (isMissingTable(fetchError)) return null
    throw fetchError
  }

  if (!existing) {
    const { data, error } = await supabase
      .from('call_review_tasks')
      .insert({
        organization_id: organization.id,
        call_id: callId,
        status: ready ? 'unassigned' : 'processing',
        updated_at: now,
      })
      .select()
      .single()
    if (error?.code === '23505') return null
    if (error) throw error
    return data
  }

  if (existing.status === 'processing' && ready) {
    const { data, error } = await supabase
      .from('call_review_tasks')
      .update({ status: 'unassigned', updated_at: now })
      .eq('id', existing.id)
      .eq('status', 'processing')
      .select()
      .single()
    if (error) throw error
    return data
  }

  return existing
}

export async function listReviewTasks(organizationId, { filter = 'unassigned', memberId } = {}) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('call_review_tasks')
    .select(
      'id, call_id, status, assigned_member_id, claimed_at, completed_at, created_at, updated_at',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filter === 'unassigned') {
    query = query.eq('status', 'unassigned')
  } else if (filter === 'mine' && memberId) {
    query = query.eq('assigned_member_id', memberId).in('status', ['assigned', 'in_review'])
  } else if (filter === 'open') {
    query = query.in('status', ['unassigned', 'assigned', 'in_review', 'processing'])
  }

  const { data: tasks, error } = await query
  if (error) throw error
  if (!tasks?.length) return []

  const callIds = tasks.map((t) => t.call_id)
  const { data: logs, error: logError } = await supabase
    .from('call_logs')
    .select('id, name, phone, intent, duration_seconds, started_at, analyzed, summary')
    .in('id', callIds)
  if (logError) throw logError

  const logById = Object.fromEntries((logs ?? []).map((l) => [l.id, l]))

  const memberIds = [...new Set(tasks.map((t) => t.assigned_member_id).filter(Boolean))]
  let membersById = {}
  if (memberIds.length) {
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, display_name, email')
      .in('id', memberIds)
    membersById = Object.fromEntries((members ?? []).map((m) => [m.id, m]))
  }

  return tasks.map((task) => {
    const log = logById[task.call_id]
    const assignee = task.assigned_member_id ? membersById[task.assigned_member_id] : null
    return {
      id: task.id,
      callId: task.call_id,
      status: task.status,
      assignedMemberId: task.assigned_member_id,
      assigneeName: assignee?.display_name || assignee?.email || null,
      claimedAt: task.claimed_at,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      call: log
        ? {
            name: log.name,
            phone: log.phone,
            intent: log.intent,
            durationSeconds: log.duration_seconds,
            timestamp: log.started_at,
            analyzed: log.analyzed,
            summary: log.summary,
          }
        : null,
    }
  })
}

/** Atomic claim — only one winner if status is unassigned. */
export async function claimReviewTask({ organizationId, callId, memberId }) {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('call_review_tasks')
    .update({
      status: 'assigned',
      assigned_member_id: memberId,
      claimed_at: now,
      updated_at: now,
    })
    .eq('organization_id', organizationId)
    .eq('call_id', callId)
    .eq('status', 'unassigned')
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return { ok: false, error: 'This call is no longer in the queue or was claimed by someone else.' }
  }
  return { ok: true, task: data }
}

export async function markReviewInProgress({ organizationId, callId, memberId }) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_review_tasks')
    .update({ status: 'in_review', updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('call_id', callId)
    .eq('assigned_member_id', memberId)
    .in('status', ['assigned', 'in_review'])
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function completeReviewTask({ organizationId, callId }) {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('call_review_tasks')
    .update({ status: 'completed', completed_at: now, updated_at: now })
    .eq('organization_id', organizationId)
    .eq('call_id', callId)
    .in('status', ['assigned', 'in_review', 'unassigned'])
  if (error) throw error
}

export async function reassignReviewTask({ organizationId, callId, memberId }) {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('call_review_tasks')
    .update({
      assigned_member_id: memberId,
      status: 'assigned',
      claimed_at: now,
      updated_at: now,
    })
    .eq('organization_id', organizationId)
    .eq('call_id', callId)
    .in('status', ['assigned', 'in_review', 'unassigned'])
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function backfillReviewTasks(organizationId) {
  const supabase = getSupabaseAdmin()
  const { data: logs, error } = await supabase
    .from('call_logs')
    .select('id, analyzed, duration_seconds, call_status, raw_payload')
    .order('started_at', { ascending: false })
    .limit(500)
  if (error) throw error

  let created = 0
  let promoted = 0
  for (const log of logs ?? []) {
    const { data: before } = await supabase
      .from('call_review_tasks')
      .select('id, status')
      .eq('call_id', log.id)
      .maybeSingle()
    const task = await ensureReviewTaskForCall(log.id, log)
    if (task && !before) created += 1
    if (before?.status === 'processing' && task?.status === 'unassigned') promoted += 1
  }
  return { scanned: logs?.length ?? 0, created, promoted }
}