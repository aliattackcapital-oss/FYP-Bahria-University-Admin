import { getSupabaseAdmin } from './supabase.js'

/** Public app origin for invite/recovery redirects (must match Supabase redirect allowlist). */
export function vocaAppUrl() {
  const explicit = process.env.VOCA_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`

  return 'http://localhost:5173'
}

/**
 * Admin invite link (bearer secret). Never log the returned link.
 */
export async function createInviteLink(email, { redirectPath = '/accept-invite' } = {}) {
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized) throw new Error('A valid email is required.')

  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured.')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to generate invite links.')
  }

  const redirectTo = `${vocaAppUrl()}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: normalized,
    options: { redirectTo },
  })

  if (error) throw error

  const link = data?.properties?.action_link
  if (!link) throw new Error('Invite link was not returned by Supabase.')

  return {
    link,
    authUserId: data.user?.id ?? null,
  }
}

export async function createRecoveryLink(email) {
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized) throw new Error('A valid email is required.')

  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured.')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to generate recovery links.')
  }

  const redirectTo = `${vocaAppUrl()}/accept-invite`

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: normalized,
    options: { redirectTo },
  })

  if (error) throw error

  const link = data?.properties?.action_link
  if (!link) throw new Error('Recovery link was not returned by Supabase.')

  return { link }
}