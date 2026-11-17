import { getSupabaseAdmin } from './supabase.js'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function isMissingTable(error) {
  const msg = `${error?.message ?? ''} ${error?.code ?? ''}`.toLowerCase()
  return msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function platformSchemaReady() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  const { error } = await supabase.from('platform_operators').select('id', { head: true, count: 'exact' }).limit(1)
  if (error && isMissingTable(error)) return false
  return !error
}

export async function findPlatformOperatorByEmail(email) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const { data, error } = await supabase
    .from('platform_operators')
    .select('id, auth_user_id, email, display_name, status, created_at, updated_at')
    .eq('email', normalized)
    .maybeSingle()
  if (error) {
    if (isMissingTable(error)) return null
    throw error
  }
  return data
}

export async function linkPlatformOperatorOnLogin({ authUserId, email, displayName }) {
  const row = await findPlatformOperatorByEmail(email)
  if (!row || row.status !== 'active') return null
  const supabase = getSupabaseAdmin()
  const patch = {
    auth_user_id: authUserId,
    updated_at: new Date().toISOString(),
  }
  if (!row.display_name?.trim() && displayName) patch.display_name = displayName
  const { data, error } = await supabase
    .from('platform_operators')
    .update(patch)
    .eq('id', row.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function countPlatformOperators() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('platform_operators')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) {
    if (isMissingTable(error)) return 0
    throw error
  }
  return count ?? 0
}

export async function bootstrapPlatformOperator({ email, displayName = 'Platform Admin' }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('A valid email is required.')
  const existing = await countPlatformOperators()
  if (existing > 0) throw new Error('A platform operator already exists. Bootstrap is disabled.')
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('platform_operators')
    .insert({
      email: normalized,
      display_name: displayName,
      status: 'active',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listOrganizationsForPlatform() {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, slug, name, status, website_url, retell_agent_id, retell_knowledge_base_id, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}