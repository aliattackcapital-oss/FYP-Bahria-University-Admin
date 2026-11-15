#!/usr/bin/env node
/**
 * One-time Super Admin bootstrap (Phase 1).
 * Requires: migration applied, SUPABASE_SERVICE_ROLE_KEY, VOCA_BOOTSTRAP_SUPER_ADMIN_EMAIL in .env
 */
import 'dotenv/config'

const base = `http://127.0.0.1:${process.env.PORT || 8787}`

async function main() {
  const email = process.env.VOCA_BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim()
  if (!email) {
    console.error('Set VOCA_BOOTSTRAP_SUPER_ADMIN_EMAIL in .env')
    process.exit(1)
  }

  const response = await fetch(`${base}/api/organization/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      displayName: process.env.VOCA_BOOTSTRAP_SUPER_ADMIN_NAME || 'Super Admin',
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('Bootstrap failed:', response.status, body.error || body)
    process.exit(1)
  }
  console.log('Bootstrap OK:', body.member?.email, body.member?.orgRole || body.member?.role)
  if (body.copyLinkOnce) {
    console.log('\n--- Invitation link (copy once; do not share in public channels) ---\n')
    console.log(body.copyLinkOnce)
    console.log('\n--- Open the link in a browser to set your password. ---\n')
  } else {
    console.warn('No invite link returned. Check SUPABASE_SERVICE_ROLE_KEY and VOCA_APP_URL.')
  }
}

main()