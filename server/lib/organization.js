import { markInvitationAccepted } from './invitations.js'
import { getSupabaseAdmin } from './supabase.js'

export const DEFAULT_ORG_SLUG = 'bahria-khi'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function orgSlug() {
  return process.env.VOCA_ORG_SLUG?.trim() || DEFAULT_ORG_SLUG
}

function isMissingTableError(error) {
  const msg = `${error?.message ?? ''} ${error?.code ?? ''}`.toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    error?.code === '42P01' ||
    error?.code === 'PGRST205'
  )
}

export async function getOrganizationBySlug(slug = orgSlug()) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { configured: false, organization: null }

  const { data, error } = await supabase
    .from('organizations')
    .select('id, slug, name, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) {
      return { configured: false, organization: null, schemaReady: false }
    }
    throw error
  }

  return { configured: true, schemaReady: true, organization: data }
}

export async function findMemberByEmail(organizationId, email) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')
  const normalized = normalizeEmail(email)
  const { data, error } = await supabase
    .from('organization_members')
    .select(
      'id, organization_id, auth_user_id, email, display_name, role, status, invited_at, joined_at, created_at, updated_at',
    )
    .eq('organization_id', organizationId)
    .eq('email', normalized)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function linkMemberOnLogin({
  organizationId,
  authUserId,
  email,
  displayName,
}) {
  const member = await findMemberByEmail(organizationId, email)
  if (!member) return null
  if (member.status === 'suspended') return member

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const patch = {
    auth_user_id: authUserId,
    updated_at: now,
  }
  if (member.status === 'invited') {
    patch.status = 'active'
    patch.joined_at = member.joined_at || now
  }
  if (!member.display_name?.trim()) {
    patch.display_name = displayName
  }

  const { data, error } = await supabase
    .from('organization_members')
    .update(patch)
    .eq('id', member.id)
    .select()
    .single()

  if (error) throw error

  await logActivity({
    organizationId,
    actorMemberId: data.id,
    action: 'member.activated',
    entityType: 'organization_member',
    entityId: data.id,
    metadata: { email: normalizeEmail(email) },
  })

  try {
    await markInvitationAccepted(organizationId, email)
  } catch {
    // invitation table optional until migration applied
  }

  return data
}

export async function updateOrganizationMember({
  organizationId,
  memberId,
  role,
  status,
  actorMemberId,
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: existing, error: fetchError } = await supabase
    .from('organization_members')
    .select('id, role, status, email')
    .eq('organization_id', organizationId)
    .eq('id', memberId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) throw new Error('Member not found.')

  if (existing.role === 'super_admin' && status === 'suspended') {
    const count = await countActiveSuperAdmins(organizationId)
    if (count <= 1 && existing.status === 'active') {
      throw new Error('Cannot suspend the last active super admin.')
    }
  }

  if (existing.role === 'super_admin' && role && role !== 'super_admin') {
    const count = await countActiveSuperAdmins(organizationId)
    if (count <= 1 && existing.status === 'active') {
      throw new Error('Cannot demote the last active super admin.')
    }
  }

  const patch = { updated_at: new Date().toISOString() }
  if (role) patch.role = role
  if (status) patch.status = status

  const { data, error } = await supabase
    .from('organization_members')
    .update(patch)
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error

  await logActivity({
    organizationId,
    actorMemberId,
    action: 'member.updated',
    entityType: 'organization_member',
    entityId: memberId,
    metadata: { role, status, email: existing.email },
  })

  return data
}

export async function listOrganizationMembers(organizationId) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('organization_members')
    .select(
      'id, organization_id, auth_user_id, email, display_name, role, status, invited_at, joined_at, created_at, updated_at',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('Organization schema is not applied. Run supabase/migrations/20261115180000_organizations.sql')
    }
    throw error
  }

  return data ?? []
}

export async function countActiveSuperAdmins(organizationId) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { count, error } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('role', 'super_admin')
    .eq('status', 'active')

  if (error) throw error
  return count ?? 0
}

export async function bootstrapSuperAdmin({
  email,
  displayName = 'Super Admin',
  organizationId,
}) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('A valid email is required for bootstrap.')

  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const activeSuperAdmins = await countActiveSuperAdmins(organizationId)
  if (activeSuperAdmins > 0) {
    throw new Error('An active super_admin already exists. Bootstrap is disabled.')
  }

  const { data: existing } = await supabase
    .from('organization_members')
    .select('id, role, status')
    .eq('organization_id', organizationId)
    .eq('email', normalized)
    .maybeSingle()

  const now = new Date().toISOString()

  if (existing) {
    if (existing.role === 'super_admin' && existing.status === 'active') {
      throw new Error('An active super_admin already exists. Bootstrap is disabled.')
    }
    const patch = {
      role: 'super_admin',
      status: 'invited',
      display_name: displayName,
      updated_at: now,
    }
    const { data, error } = await supabase
      .from('organization_members')
      .update(patch)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    await logActivity({
      organizationId,
      actorMemberId: data.id,
      action: 'member.bootstrap_super_admin',
      entityType: 'organization_member',
      entityId: data.id,
      metadata: { email: normalized },
    })
    return data
  }

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      email: normalized,
      display_name: displayName,
      role: 'super_admin',
      status: 'invited',
    })
    .select()
    .single()

  if (error) throw error

  await logActivity({
    organizationId,
    actorMemberId: data.id,
    action: 'member.bootstrap_super_admin',
    entityType: 'organization_member',
    entityId: data.id,
    metadata: { email: normalized },
  })

  return data
}

export async function logActivity({
  organizationId,
  actorMemberId = null,
  action,
  entityType = null,
  entityId = null,
  metadata = {},
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      organization_id: organizationId,
      actor_member_id: actorMemberId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    if (isMissingTableError(error)) return null
    throw error
  }

  return data
}

export function toClientMember(row) {
  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    front_desk: 'Front Desk',
  }
  const statusLabels = {
    active: 'Active',
    invited: 'Invited',
    suspended: 'Suspended',
  }

  return {
    id: row.id,
    name: row.display_name?.trim() || row.email,
    email: row.email,
    role: roleLabels[row.role] || row.role,
    orgRole: row.role,
    department: 'Organization',
    status: statusLabels[row.status] || row.status,
    orgStatus: row.status,
    joinedAt: row.joined_at || row.created_at,
  }
}