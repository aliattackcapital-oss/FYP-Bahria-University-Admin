import { fetchRetell } from './retellFetch.js'
import { normalizeHttpUrl } from './urls.js'

const DEFAULT_PROMPT = 'Enter your agent prompt here'
const DEFAULT_BEGIN = 'Hello, how can I help you today?'

function apiKey() {
  return process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
}

const DEFAULT_VOICE_ID = 'custom_voice_c9dc5cf570a94a9201c339dec5'

function defaultVoiceId() {
  return process.env.RETELL_DEFAULT_VOICE_ID?.trim() || DEFAULT_VOICE_ID
}

function authHeaders() {
  const key = apiKey()
  if (!key) throw new Error('Missing RETELL_API_KEY.')
  return { Authorization: `Bearer ${key}` }
}

async function readError(response) {
  let message = `Voice API error (${response.status})`
  try {
    const body = await response.json()
    message = body?.error_message || body?.message || body?.error || message
  } catch {
    message = (await response.text().catch(() => '')) || message
  }
  throw new Error(message)
}

function kbName(organizationName) {
  const base = String(organizationName ?? 'Org').trim().slice(0, 35)
  return base || 'Org KB'
}

/**
 * Create KB → LLM (placeholder prompt) → agent → publish first version.
 * Returns { knowledgeBaseId, llmId, agentId }.
 */
export async function provisionRetellForOrganization({ organizationName, websiteUrl }) {
  const key = apiKey()
  if (!key) throw new Error('Missing RETELL_API_KEY.')

  const kbSeedUrl = normalizeHttpUrl(websiteUrl)
  if (!kbSeedUrl) {
    throw new Error('A valid https website URL is required to seed the knowledge base.')
  }

  const kbForm = new FormData()
  kbForm.append('knowledge_base_name', kbName(organizationName))
  kbForm.append('knowledge_base_urls', JSON.stringify([kbSeedUrl]))
  kbForm.append('enable_auto_refresh', 'true')

  const kbRes = await fetchRetell('https://api.retellai.com/create-knowledge-base', {
    method: 'POST',
    headers: authHeaders(),
    body: kbForm,
  })
  if (!kbRes.ok) await readError(kbRes)
  const kb = await kbRes.json()
  const knowledgeBaseId = kb.knowledge_base_id
  if (!knowledgeBaseId) throw new Error('Knowledge base create did not return an id.')

  const llmRes = await fetchRetell('https://api.retellai.com/create-retell-llm', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_speaker: 'agent',
      general_prompt: DEFAULT_PROMPT,
      begin_message: DEFAULT_BEGIN,
      knowledge_base_ids: [knowledgeBaseId],
    }),
  })
  if (!llmRes.ok) await readError(llmRes)
  const llm = await llmRes.json()
  const llmId = llm.llm_id
  if (!llmId) throw new Error('LLM create did not return an id.')

  const agentRes = await fetchRetell('https://api.retellai.com/create-agent', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_name: String(organizationName).slice(0, 80) || 'Voice agent',
      response_engine: { type: 'retell-llm', llm_id: llmId },
      voice_id: defaultVoiceId(),
    }),
  })
  if (!agentRes.ok) await readError(agentRes)
  const agent = await agentRes.json()
  const agentId = agent.agent_id
  if (!agentId) throw new Error('Agent create did not return an id.')

  const version = agent.version
  if (version != null) {
    const pubRes = await fetchRetell(
      `https://api.retellai.com/publish-agent-version/${encodeURIComponent(agentId)}`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      },
    )
    if (!pubRes.ok) await readError(pubRes)
  }

  return { knowledgeBaseId, llmId, agentId }
}