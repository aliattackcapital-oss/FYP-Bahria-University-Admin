#!/usr/bin/env node
/**
 * Verifies agent prompt load + publish (no-op: re-publishes current text).
 * Requires RETELL_API_KEY and RETELL_AGENT_ID in env.
 */
import 'dotenv/config'
import { getAgentPromptDetails, publishAgentGeneralPrompt } from '../server/lib/agentPrompt.js'
import { getOrganizationBySlug } from '../server/lib/organization.js'

async function main() {
  const { organization } = await getOrganizationBySlug()
  if (!organization) throw new Error('No organization found (apply migrations / set VOCA_ORG_SLUG)')
  const before = await getAgentPromptDetails(organization)
  if (!before.generalPrompt?.trim()) {
    console.error('agent-prompt-smoke: empty general prompt')
    process.exit(1)
  }

  const after = await publishAgentGeneralPrompt(
    organization,
    before.generalPrompt,
    before.beginMessage ?? '',
  )
  if (!after.generalPrompt?.trim()) {
    console.error('agent-prompt-smoke: publish returned empty prompt')
    process.exit(1)
  }

  const lenOk = after.generalPrompt.length === before.generalPrompt.length
  console.log(
    'agent-prompt-smoke: ok',
    `agent v${before.agentVersion ?? '?'} -> v${after.agentVersion ?? '?'}`,
    `promptChars=${after.generalPrompt.length}`,
    lenOk ? '' : '(length changed)',
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('agent-prompt-smoke:', err.message || err)
  process.exit(1)
})