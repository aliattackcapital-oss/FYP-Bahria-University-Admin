#!/usr/bin/env node
import 'dotenv/config'

const base = `http://127.0.0.1:${process.env.PORT || 8787}`

async function get(path, headers = {}) {
  const response = await fetch(`${base}${path}`, { headers })
  const json = await response.json().catch(() => ({}))
  return { status: response.status, json }
}

async function main() {
  const health = await get('/api/health')
  console.log('GET /api/health', health.status, health.json?.ok ?? '')

  const org = await get('/api/organization')
  console.log('GET /api/organization (no session)', org.status, '— expect 401 when API guard is on')

  const token = process.env.ORG_SMOKE_ACCESS_TOKEN?.trim()
  if (token) {
    const authHeaders = { Authorization: `Bearer ${token}` }
    const orgAuth = await get('/api/organization', authHeaders)
    console.log('GET /api/organization (session)', orgAuth.status, orgAuth.json.schemaReady ?? orgAuth.json.configured)

    const members = await get('/api/organization/members', authHeaders)
    console.log(
      'GET /api/organization/members',
      members.status,
      'count',
      members.json.members?.length ?? 0,
    )

    if (!orgAuth.json.schemaReady) {
      console.log('\nApply migrations in supabase/migrations/')
      process.exit(2)
    }

    process.exit(orgAuth.json.configured && members.status === 200 ? 0 : 1)
  }

  console.log('\nOptional: set ORG_SMOKE_ACCESS_TOKEN to a signed-in JWT for full org smoke.')
  process.exit(health.status === 200 ? 0 : 1)
}

main()