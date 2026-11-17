import { resolveVoiceIds } from './orgVoice.js'
import { isSupabaseConfigured } from './supabase.js'

export function healthPayload() {
  const voice = resolveVoiceIds(null)
  return {
    ok: true,
    configured: Boolean(process.env.RETELL_API_KEY?.trim() && voice.agentId),
    knowledgeBase: Boolean(voice.knowledgeBaseId),
    supabase: isSupabaseConfigured(),
  }
}
