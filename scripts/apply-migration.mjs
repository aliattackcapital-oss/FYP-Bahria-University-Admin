#!/usr/bin/env node
/**
 * Apply a SQL migration file via DATABASE_URL (Supabase pooler).
 * Usage: DATABASE_URL=... node scripts/apply-migration.mjs supabase/migrations/20261115210000_evaluation_likert_flags.sql
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg

async function main() {
  const rel = process.argv[2]
  if (!rel) {
    console.error('Usage: node scripts/apply-migration.mjs <path-to.sql>')
    process.exit(1)
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env (Supabase → Settings → Database → Connection string, pooler).')
    process.exit(1)
  }

  const full = path.join(process.cwd(), rel)
  const sql = fs.readFileSync(full, 'utf8')

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    await client.query(sql)
    console.log('Applied', rel)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})