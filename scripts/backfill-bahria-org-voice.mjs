#!/usr/bin/env node
/**
 * Copy RETELL_AGENT_ID / RETELL_KNOWLEDGE_BASE_ID from env onto the bahria-khi org row.
 */
import 'dotenv/config'
import pg from 'pg'

const url = process.env.DATABASE_URL?.trim()
const agentId = process.env.RETELL_AGENT_ID?.trim()
const kbId = process.env.RETELL_KNOWLEDGE_BASE_ID?.trim()

if (!url) {
  console.error('Set DATABASE_URL')
  process.exit(1)
}
if (!agentId && !kbId) {
  console.error('Set RETELL_AGENT_ID and/or RETELL_KNOWLEDGE_BASE_ID')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  const res = await client.query(
    `update public.organizations
     set retell_agent_id = coalesce($1, retell_agent_id),
         retell_knowledge_base_id = coalesce($2, retell_knowledge_base_id),
         updated_at = now()
     where slug = 'bahria-khi'
     returning id, slug, retell_agent_id, retell_knowledge_base_id`,
    [agentId || null, kbId || null],
  )
  console.log('Updated:', res.rows[0] ?? 'no bahria-khi row')
} finally {
  await client.end()
}