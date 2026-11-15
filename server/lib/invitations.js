import { getSupabaseAdmin } from './supabase.js'

const INVITE_TTL_DAYS = 7

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export function defaultInviteExpiry() {
  const d = new Date()
  d.setDate(d.getDate() + INVITE_TTL_DAYS)
  return d.toISOString()
}

export async function upsertPendingInvitation({
  organizationId,
  email,
  role,
  invitedByMemberId,
}) {
  const supabase = getSupabaseAdmin()
  const normalized = normalizeEmail(email)
  const expiresAt = defaultInviteExpiry()

  const { data: existing } = await supabase
    .from('organization_invitations')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('email', normalized)
    .maybeSingle()

  if (existing?.id && existing.status !== 'revoked') {
    const { data, error } = await supabase
      .from('organization_invitations')
      .update({
        role,
        invited_by_member_id: invitedByMemberId,
        expires_at: expiresAt,
        status: 'pending',
        accepted_at: null,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email: normalized,
      role,
      invited_by_member_id: invitedByMemberId,
      expires_at: expiresAt,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markInvitationAccepted(organizationId, email) {
  const supabase = getSupabaseAdmin()
  const normalized = normalizeEmail(email)
  const { error } = await supabase
    .from('organization_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('email', normalized)
    .in('status', ['pending'])
  if (error) throw error
}

export async function revokeInvitation({ organizationId, invitationId }) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organization_invitations')
    .update({ status: 'revoked' })
    .eq('organization_id', organizationId)
    .eq('id', invitationId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listInvitations(organizationId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('id, email, role, status, expires_at, accepted_at, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}