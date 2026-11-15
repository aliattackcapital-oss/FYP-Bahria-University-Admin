import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'

/** Strip auth params from the address bar after we consume them. */
function cleanAuthParamsFromUrl() {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of ['code', 'token_hash', 'type', 'error', 'error_description']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) {
    const next = url.pathname + (url.search ? url.search : '') + url.hash
    window.history.replaceState({}, '', next)
  }
}

/**
 * After an invite/recovery redirect, establish a Supabase session from URL params.
 */
export async function completeAuthFromCurrentUrl(client: SupabaseClient) {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (error) throw error
    cleanAuthParamsFromUrl()
    return client.auth.getSession()
  }

  if (tokenHash && type) {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) throw error
    cleanAuthParamsFromUrl()
    return client.auth.getSession()
  }

  // Implicit/hash flow — detectSessionInUrl runs on client init; allow a tick
  await new Promise((resolve) => setTimeout(resolve, 150))
  return client.auth.getSession()
}

export function isAcceptInvitePath() {
  return (
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '') === '/accept-invite'
  )
}