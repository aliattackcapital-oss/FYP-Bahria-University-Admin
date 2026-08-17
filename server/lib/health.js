import { knowledgeBaseId } from './knowledgeBase.js'
import { isSupabaseConfigured } from './supabase.js'

export function healthPayload() {
  return {
    ok: true,
    configured: Boolean(
      process.env.RETELL_API_KEY?.trim() && process.env.RETELL_AGENT_ID?.trim(),
    ),
    knowledgeBase: Boolean(knowledgeBaseId()),
    supabase: isSupabaseConfigured(),
  }
}
