import { syncAdminFlagForEvaluation } from './evaluationFlags.js'
import { isLikertSchemaColumnMissing, parseEvaluationPayload } from './evaluationValidation.js'
import { getSupabaseAdmin } from './supabase.js'

const VERDICTS = new Set(['correct', 'partially_correct', 'incorrect', 'unable_to_assess'])

export function isValidVerdict(value) {
  return VERDICTS.has(String(value ?? ''))
}

function isMissingTable(error) {
  const msg = `${error?.message ?? ''}`.toLowerCase()
  return msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST205'
}

const EVALUATION_SELECT = `
  id,
  call_id,
  verdict,
  notes,
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
  reviewer_member_id,
  created_at,
  updated_at,
  organization_members:reviewer_member_id (display_name, email)
`

export async function evaluationsSchemaReady() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  const { error } = await supabase.from('call_evaluations').select('rating_q1').limit(1)
  if (error) {
    if (isMissingTable(error) || isLikertSchemaColumnMissing(error)) return false
    const { error: legacy } = await supabase
      .from('call_evaluations')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
    if (legacy && isMissingTable(legacy)) return false
    return !legacy
  }
  return true
}

export async function getEvaluationForCall(organizationId, callId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_evaluations')
    .select(EVALUATION_SELECT)
    .eq('organization_id', organizationId)
    .eq('call_id', callId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listEvaluations(organizationId, { limit = 100 } = {}) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_evaluations')
    .select(
      'id, call_id, verdict, average_rating, flag_for_admin, reviewer_member_id, created_at, updated_at',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function upsertEvaluation({
  organizationId,
  callId,
  reviewerMemberId,
  payload,
}) {
  const parsed = parseEvaluationPayload(payload)
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  const row = {
    organization_id: organizationId,
    call_id: callId,
    reviewer_member_id: reviewerMemberId,
    verdict: null,
    notes: parsed.suggestions,
    ...parsed.ratings,
    average_rating: parsed.averageRating,
    suggestions: parsed.suggestions,
    flag_for_admin: parsed.flagForAdmin,
    flag_priority: parsed.flagForAdmin ? parsed.flagPriority : null,
    flag_reason: parsed.flagForAdmin ? parsed.flagReason : null,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('call_evaluations')
    .upsert(row, { onConflict: 'organization_id,call_id' })
    .select()
    .single()
  if (error) throw error

  await syncAdminFlagForEvaluation({
    organizationId,
    evaluationId: data.id,
    callId,
    flagged: parsed.flagForAdmin,
    flagPriority: parsed.flagPriority,
    flagReason: parsed.flagReason,
  })

  return data
}

export async function countEvaluations(organizationId) {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from('call_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .not('average_rating', 'is', null)
  if (error) {
    if (isMissingTable(error)) return 0
    const { count: legacyCount, error: legacyErr } = await supabase
      .from('call_evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    if (legacyErr) {
      if (isMissingTable(legacyErr)) return 0
      throw legacyErr
    }
    return legacyCount ?? 0
  }
  return count ?? 0
}

export async function verdictBreakdown(organizationId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_evaluations')
    .select('verdict, average_rating')
    .eq('organization_id', organizationId)
  if (error) {
    if (isMissingTable(error)) return {}
    throw error
  }
  const out = {}
  for (const row of data ?? []) {
    if (row.average_rating != null) {
      const bucket = row.average_rating >= 4 ? 'strong' : row.average_rating >= 3 ? 'neutral' : 'weak'
      out[bucket] = (out[bucket] ?? 0) + 1
      continue
    }
    if (row.verdict) out[row.verdict] = (out[row.verdict] ?? 0) + 1
  }
  return out
}