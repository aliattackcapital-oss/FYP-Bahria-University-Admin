import { resolveVoiceIds, voiceConfigured } from './orgVoice.js'
import { fetchRetell } from './retellFetch.js'

function retellKey() {
  return process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
}

function agentIdForOrg(organization) {
  return resolveVoiceIds(organization).agentId
}

function authHeaders() {
  const key = retellKey()
  if (!key) throw new Error('Missing RETELL_API_KEY.')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function readError(response) {
  let message = `Retell API error (${response.status})`
  try {
    const body = await response.json()
    message = body?.error_message || body?.message || body?.error || message
  } catch {
    try {
      message = (await response.text()) || message
    } catch {
      // ignore
    }
  }
  const err = new Error(message)
  err.status = response.status
  throw err
}

export function agentPromptConfigured(organization) {
  return voiceConfigured(organization)
}

async function getAgentRecord(agentId) {
  const agentRes = await fetchRetell(`https://api.retellai.com/get-agent/${encodeURIComponent(agentId)}`, {
    headers: authHeaders(),
  })
  if (!agentRes.ok) await readError(agentRes)
  return agentRes.json()
}

/** Retell rejects PATCH on a published LLM — fork a draft agent version first. */
async function ensureDraftAgent(agentId) {
  let agent = await getAgentRecord(agentId)
  if (!agent.is_published) return agent

  const baseVersion = agent.version
  if (baseVersion == null) {
    throw new Error('Could not read agent version to create a draft.')
  }

  const createRes = await fetchRetell(
    `https://api.retellai.com/create-agent-version/${encodeURIComponent(agentId)}`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ base_version: baseVersion }),
    },
  )
  if (!createRes.ok) await readError(createRes)

  agent = await getAgentRecord(agentId)
  if (agent.is_published) {
    throw new Error('Could not open a draft for editing. Try again in a moment.')
  }
  return agent
}

function patchLlmUrl(llmId, llmVersion) {
  const versionQuery = llmVersion != null ? `?version=${encodeURIComponent(llmVersion)}` : ''
  return `https://api.retellai.com/update-retell-llm/${encodeURIComponent(llmId)}${versionQuery}`
}

async function getLlmRecord(llmId, llmVersion) {
  const versionQuery = llmVersion != null ? `?version=${encodeURIComponent(llmVersion)}` : ''
  const llmRes = await fetchRetell(
    `https://api.retellai.com/get-retell-llm/${encodeURIComponent(llmId)}${versionQuery}`,
    { headers: authHeaders() },
  )
  if (!llmRes.ok) await readError(llmRes)
  return llmRes.json()
}

export async function getAgentPromptDetails(organization) {
  if (!agentPromptConfigured(organization)) {
    throw new Error('Missing voice API key or agent id for this organization.')
  }
  const agentId = agentIdForOrg(organization)
  const agent = await getAgentRecord(agentId)
  const llmId = agent?.response_engine?.llm_id
  if (!llmId) throw new Error('This agent has no LLM response engine attached.')

  const llmVersion = agent?.response_engine?.version ?? null
  const llm = await getLlmRecord(llmId, llmVersion)

  return {
    agentId: agent.agent_id,
    agentName: agent.agent_name ?? null,
    llmId: llm.llm_id,
    agentVersion: agent.version ?? null,
    llmVersion: llm.version ?? null,
    isPublished: Boolean(agent.is_published),
    generalPrompt: llm.general_prompt ?? '',
    beginMessage: llm.begin_message ?? null,
  }
}

export async function publishAgentGeneralPrompt(organization, generalPrompt, beginMessage) {
  if (!agentPromptConfigured(organization)) {
    throw new Error('Missing voice API key or agent id for this organization.')
  }
  const prompt = String(generalPrompt ?? '').trim()
  if (!prompt) throw new Error('Prompt cannot be empty.')
  const begin =
    beginMessage === undefined || beginMessage === null ? undefined : String(beginMessage)

  const agentId = agentIdForOrg(organization)
  let agent = await ensureDraftAgent(agentId)

  const patchBody = { general_prompt: prompt }
  if (begin !== undefined) patchBody.begin_message = begin

  const patchDraftLlm = async () => {
    agent = await getAgentRecord(agentId)
    if (agent.is_published) agent = await ensureDraftAgent(agentId)
    const llmId = agent?.response_engine?.llm_id
    if (!llmId) throw new Error('This agent has no LLM response engine attached.')
    const llmVersion = agent?.response_engine?.version ?? null
    return fetchRetell(patchLlmUrl(llmId, llmVersion), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patchBody),
    })
  }

  let patchRes = await patchDraftLlm()
  if (!patchRes.ok) {
    const body = await patchRes
      .clone()
      .json()
      .catch(() => ({}))
    const message = String(body?.error_message || body?.message || '').toLowerCase()
    if (message.includes('published')) {
      agent = await ensureDraftAgent(agentId)
      patchRes = await patchDraftLlm()
    }
  }
  if (!patchRes.ok) await readError(patchRes)

  agent = await getAgentRecord(agentId)
  const version = agent?.version
  if (version == null) throw new Error('Could not read agent version for publish.')

  const publishRes = await fetchRetell(
    `https://api.retellai.com/publish-agent-version/${encodeURIComponent(agentId)}`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ version }),
    },
  )
  if (!publishRes.ok) await readError(publishRes)

  return getAgentPromptDetails(organization)
}