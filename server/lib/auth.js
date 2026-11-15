import { createClient } from '@supabase/supabase-js'
import { getOrganizationBySlug, linkMemberOnLogin, findMemberByEmail } from './organization.js'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.js'

function supabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ''
  )
}

function supabaseAnonKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ''
  )
}

export function bearerToken(req) {
  const header = req.headers?.authorization ?? req.headers?.Authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

export async function getUserFromToken(accessToken) {
  if (!accessToken || !isSupabaseConfigured()) return null
  const url = supabaseUrl()
  const key = supabaseAnonKey()
  if (!url || !key) return null

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data?.user) return null
  return data.user
}

function allowedEmailDomain(email) {
  const raw = process.env.VOCA_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase()
  if (!raw) return true
  const domains = raw.split(',').map((d) => d.trim()).filter(Boolean)
  const at = String(email).toLowerCase().lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1).toLowerCase()
  return domains.includes(domain)
}

export async function requireActiveMember(req) {
  const token = bearerToken(req)
  if (!token) {
    return { ok: false, status: 401, error: 'Sign in required.' }
  }

  const user = await getUserFromToken(token)
  if (!user?.email) {
    return { ok: false, status: 401, error: 'Invalid or expired session.' }
  }

  if (!allowedEmailDomain(user.email)) {
    return { ok: false, status: 403, error: 'This email domain is not allowed.' }
  }

  const { organization, schemaReady } = await getOrganizationBySlug()
  if (!schemaReady || !organization) {
    return { ok: false, status: 503, error: 'Organization is not configured.' }
  }

  let member = await findMemberByEmail(organization.id, user.email)

  if (!member) {
    return {
      ok: false,
      status: 403,
      error: 'You are not on the approved members list. Ask a super admin for an invite.',
    }
  }

  if (member.status === 'suspended') {
    return { ok: false, status: 403, error: 'Your account is suspended.' }
  }

  if (member.status !== 'active') {
    return {
      ok: false,
      status: 403,
      error: 'Your invite is pending. Sign in with the email you were invited with after accepting the invite link.',
    }
  }

  return { ok: true, user, member, organization }
}

export async function enforceMember(req, res, options = {}) {
  const result = await requireActiveMember(req)
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return null
  }
  if (options.roles?.length && !options.roles.includes(result.member.role)) {
    res.status(403).json({ error: 'Insufficient permissions.' })
    return null
  }
  return result
}

export async function activateInvitedMember(req) {
  const token = bearerToken(req)
  if (!token) return { ok: false, status: 401, error: 'Sign in required.' }

  const user = await getUserFromToken(token)
  if (!user?.email || !user.id) {
    return { ok: false, status: 401, error: 'Invalid session.' }
  }

  if (!allowedEmailDomain(user.email)) {
    return { ok: false, status: 403, error: 'This email domain is not allowed.' }
  }

  const { organization, schemaReady } = await getOrganizationBySlug()
  if (!schemaReady || !organization) {
    return { ok: false, status: 503, error: 'Organization is not configured.' }
  }

  const member = await linkMemberOnLogin({
    organizationId: organization.id,
    authUserId: user.id,
    email: user.email,
    displayName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email,
  })

  if (!member) {
    return {
      ok: false,
      status: 403,
      error: 'No invite found for this account. Contact your super admin.',
    }
  }

  if (member.status === 'suspended') {
    return { ok: false, status: 403, error: 'Your account is suspended.' }
  }

  return {
    ok: true,
    user,
    member,
    organization,
  }
}