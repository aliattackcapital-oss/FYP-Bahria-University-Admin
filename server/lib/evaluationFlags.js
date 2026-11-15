import { getSupabaseAdmin } from './supabase.js'
import { ADMIN_FLAG_STATUSES } from './evaluationValidation.js'

function isMissingTable(error) {
  const msg = `${error?.message ?? ''}`.toLowerCase()
  return msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function adminFlagsSchemaReady() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  const { error } = await supabase
    .from('call_evaluation_admin_flags')
    .select('id', { head: true, count: 'exact' })
    .limit(1)
  if (error && isMissingTable(error)) return false
  return !error
}

export async function syncAdminFlagForEvaluation({
  organizationId,
  evaluationId,
  callId,
  flagged,
  flagPriority,
  flagReason,
}) {
  const supabase = getSupabaseAdmin()
  const ready = await adminFlagsSchemaReady()
  if (!ready) return null

  const { data: existing } = await supabase
    .from('call_evaluation_admin_flags')
    .select('id, status')
    .eq('evaluation_id', evaluationId)
    .maybeSingle()

  if (!flagged) {
    if (existing && existing.status === 'flagged') {
      await supabase.from('call_evaluation_admin_flags').delete().eq('id', existing.id)
    }
    return null
  }

  const now = new Date().toISOString()
  if (existing) {
    const { data, error } = await supabase
      .from('call_evaluation_admin_flags')
      .update({
        call_id: callId,
        status: existing.status === 'resolved' ? 'flagged' : existing.status,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('call_evaluation_admin_flags')
    .insert({
      organization_id: organizationId,
      evaluation_id: evaluationId,
      call_id: callId,
      status: 'flagged',
      updated_at: now,
    })
    .select()
    .single()
  if (error) throw error
  void flagPriority
  void flagReason
  return data
}

export async function listFlaggedCalls(organizationId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_evaluation_admin_flags')
    .select(
      `
      id,
      call_id,
      status,
      admin_notes,
      changes_documented,
      created_at,
      updated_at,
      call_evaluations:evaluation_id (
        id,
        average_rating,
        flag_priority,
        flag_reason,
        flag_for_admin,
        reviewer_member_id,
        created_at,
        organization_members:reviewer_member_id (display_name, email)
      )
    `,
    )
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
  if (error) throw error

  const callIds = [...new Set((data ?? []).map((row) => row.call_id))]
  let logsById = {}
  if (callIds.length > 0) {
    const { data: logs } = await supabase.from('call_logs').select('id, started_at, name').in('id', callIds)
    logsById = Object.fromEntries((logs ?? []).map((l) => [l.id, l]))
  }

  return (data ?? []).map((row) => {
    const evaluation = row.call_evaluations
    const log = logsById[row.call_id]
    return {
      id: row.id,
      callId: row.call_id,
      status: row.status,
      adminNotes: row.admin_notes,
      changesDocumented: row.changes_documented,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      callName: log?.name ?? row.call_id,
      callDate: log?.started_at ?? evaluation?.created_at ?? row.created_at,
      averageRating: evaluation?.average_rating ?? null,
      flagPriority: evaluation?.flag_priority ?? 'normal',
      flagReason: evaluation?.flag_reason ?? null,
      reviewerName:
        evaluation?.organization_members?.display_name ??
        evaluation?.organization_members?.email ??
        null,
      evaluationId: evaluation?.id ?? null,
    }
  })
}

export async function getFlaggedCallDetail(organizationId, flagId) {
  const supabase = getSupabaseAdmin()
  const { data: flag, error } = await supabase
    .from('call_evaluation_admin_flags')
    .select(
      `
      id,
      call_id,
      status,
      admin_notes,
      changes_documented,
      created_at,
      updated_at,
      last_updated_by_member_id,
      call_evaluations:evaluation_id (
        id,
        rating_q1,
        rating_q2,
        rating_q3,
        rating_q4,
        rating_q5,
        average_rating,
        suggestions,
        flag_for_admin,
        flag_priority,
        flag_reason,
        created_at,
        updated_at,
        organization_members:reviewer_member_id (display_name, email)
      )
    `,
    )
    .eq('organization_id', organizationId)
    .eq('id', flagId)
    .maybeSingle()
  if (error) throw error
  if (!flag) return null

  const { data: history } = await supabase
    .from('call_evaluation_admin_flag_history')
    .select(
      'id, from_status, to_status, admin_notes, changes_documented, created_at, organization_members:admin_member_id (display_name, email)',
    )
    .eq('admin_flag_id', flag.id)
    .order('created_at', { ascending: false })

  return { flag, history: history ?? [] }
}

export async function updateAdminFlagReview({
  organizationId,
  flagId,
  adminMemberId,
  status,
  adminNotes,
  changesDocumented,
}) {
  if (!ADMIN_FLAG_STATUSES.has(status)) throw new Error('Invalid review status.')

  const supabase = getSupabaseAdmin()
  const { data: current, error: fetchError } = await supabase
    .from('call_evaluation_admin_flags')
    .select('id, status, admin_notes, changes_documented')
    .eq('organization_id', organizationId)
    .eq('id', flagId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!current) throw new Error('Flagged call not found.')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('call_evaluation_admin_flags')
    .update({
      status,
      admin_notes:
        adminNotes !== undefined ? adminNotes.trim() || null : current.admin_notes,
      changes_documented:
        changesDocumented !== undefined
          ? changesDocumented.trim() || null
          : current.changes_documented,
      last_updated_by_member_id: adminMemberId,
      updated_at: now,
    })
    .eq('id', flagId)
    .select()
    .single()
  if (error) throw error

  const { error: histError } = await supabase.from('call_evaluation_admin_flag_history').insert({
    admin_flag_id: flagId,
    organization_id: organizationId,
    from_status: current.status,
    to_status: status,
    admin_member_id: adminMemberId,
    admin_notes: adminNotes?.trim() || null,
    changes_documented: changesDocumented?.trim() || null,
  })
  if (histError) throw histError

  return data
}