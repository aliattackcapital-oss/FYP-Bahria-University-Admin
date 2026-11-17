/** Per-organization LiveKit/Retell voice resource ids with env fallback (legacy single-tenant). */

export function resolveVoiceIds(organization) {
  const agentId =
    organization?.retell_agent_id?.trim() || process.env.RETELL_AGENT_ID?.trim() || ''
  const knowledgeBaseId =
    organization?.retell_knowledge_base_id?.trim() ||
    process.env.RETELL_KNOWLEDGE_BASE_ID?.trim() ||
    ''
  return { agentId, knowledgeBaseId }
}

export function voiceConfigured(organization) {
  const { agentId } = resolveVoiceIds(organization)
  return Boolean(process.env.RETELL_API_KEY?.trim() && agentId)
}

export function knowledgeBaseConfigured(organization) {
  const { knowledgeBaseId } = resolveVoiceIds(organization)
  return Boolean(process.env.RETELL_API_KEY?.trim() && knowledgeBaseId)
}