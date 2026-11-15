#!/usr/bin/env node
/**
 * One-off: apply phase2 migration SQL + link super admin auth user.
 * Usage: DATABASE_URL=... node scripts/provision-super-admin.mjs
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const EMAIL = 'ali.attackcapital@gmail.com'
const PASSWORD = 'password123'
const DISPLAY = 'Ali Rashid'

const { Client } = pg

async function runSqlFile(client, relativePath) {
  const full = path.join(process.cwd(), relativePath)
  const sql = fs.readFileSync(full, 'utf8')
  await client.query(sql)
  console.log('Applied', relativePath)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Set DATABASE_URL (direct Postgres connection string).')
    process.exit(1)
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  try {
    await runSqlFile(client, 'supabase/migrations/20261115190000_phase2_5_extensions.sql')
  } catch (err) {
    const msg = String(err?.message ?? err)
    if (msg.includes('already exists') || msg.includes('duplicate')) {
      console.warn('Migration partial (already applied):', msg.split('\n')[0])
    } else {
      throw err
    }
  } finally {
    await client.end()
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const listed = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (listed.error) throw listed.error
  for (const user of listed.data.users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) console.warn('delete user failed', user.email, error.message)
    else console.log('Deleted auth user', user.email)
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'bahria-khi')
    .single()
  if (!org?.id) throw new Error('Organization bahria-khi not found')

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DISPLAY },
  })
  if (createError) throw createError
  const authUserId = created.user.id
  console.log('Created auth user', EMAIL, authUserId)

  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', org.id)
    .eq('email', EMAIL)
    .maybeSingle()

  const now = new Date().toISOString()
  if (existing?.id) {
    const { error } = await supabase
      .from('organization_members')
      .update({
        auth_user_id: authUserId,
        display_name: DISPLAY,
        role: 'super_admin',
        status: 'active',
        joined_at: now,
        updated_at: now,
      })
      .eq('id', existing.id)
    if (error) throw error
    console.log('Updated organization_members row', existing.id)
  } else {
    const { error } = await supabase.from('organization_members').insert({
      organization_id: org.id,
      auth_user_id: authUserId,
      email: EMAIL,
      display_name: DISPLAY,
      role: 'super_admin',
      status: 'active',
      joined_at: now,
    })
    if (error) throw error
    console.log('Inserted organization_members row')
  }

  const { data: others } = await supabase
    .from('organization_members')
    .select('id, email')
    .eq('organization_id', org.id)
    .neq('email', EMAIL)
  for (const row of others ?? []) {
    await supabase.from('organization_members').delete().eq('id', row.id)
    console.log('Removed extra member', row.email)
  }

  console.log('\nDone. Sign in at /login with', EMAIL, 'and the configured password.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})