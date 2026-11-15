import { getSupabaseAdmin } from './supabase.js'

const VERDICTS = new Set(['correct', 'partially_correct', 'incorrect', 'unable_to_assess'])

export function isValidVerdict(value) {
  return VERDICTS.has(String(value ?? ''))
}

function isMissingTable(error) {
  const msg = `${error?.message ?? ''}`.toLowerCase()
  return msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function evaluationsSchemaReady() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  const { error } = await supabase.from('call_evaluations').select('id', { head: true, count: 'exact' }).limit(1)
  if (error && isMissingTable(error)) return false
  return !error
}

export async function getEvaluationForCall(organizationId, callId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_evaluations')
    .select(
      'id, call_id, verdict, notes, reviewer_member_id, created_at, updated_at, organization_members:reviewer_member_id (display_name, email)',
    )
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
    .select('id, call_id, verdict, notes, reviewer_member_id, created_at, updated_at')
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
  verdict,
  notes,
}) {
  if (!isValidVerdict(verdict)) throw new Error('Invalid evaluation verdict.')
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('call_evaluations')
    .upsert(
      {
        organization_id: organizationId,
        call_id: callId,
        reviewer_member_id: reviewerMemberId,
        verdict,
        notes: notes?.trim() || null,
        updated_at: now,
      },
      { onConflict: 'organization_id,call_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function countEvaluations(organizationId) {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from('call_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
  if (error) {
    if (isMissingTable(error)) return 0
    throw error
  }
  return count ?? 0
}

export async function verdictBreakdown(organizationId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_evaluations')
    .select('verdict')
    .eq('organization_id', organizationId)
  if (error) {
    if (isMissingTable(error)) return {}
    throw error
  }
  const out = {}
  for (const row of data ?? []) {
    out[row.verdict] = (out[row.verdict] ?? 0) + 1
  }
  return out
}