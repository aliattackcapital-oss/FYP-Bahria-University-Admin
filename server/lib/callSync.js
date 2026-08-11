import { getSupabaseAdmin } from './supabase.js'

const PLACEHOLDER = /^(not given|n\/a|na|none|unknown|null|undefined|—|-)$/i

const SPOKEN_NUMBERS = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
}

function cleanValue(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || PLACEHOLDER.test(trimmed)) return ''
  return trimmed
}

function pickCustom(data, keys) {
  if (!data || typeof data !== 'object') return ''
  for (const key of keys) {
    const match = Object.entries(data).find(([k]) => k.toLowerCase() === key)
    if (!match) continue
    const raw = match[1]
    const cleaned = cleanValue(raw == null ? '' : String(raw))
    if (cleaned) return cleaned
  }
  return ''
}

function spokenDigits(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((part) => SPOKEN_NUMBERS[part] ?? (/^\d+$/.test(part) ? part : ''))
    .join('')
}

function extractFromTranscript(lines) {
  const blob = (lines ?? []).map((line) => line.text).join('\n')
  const result = { name: '', phone: '', email: '' }

  const nameMatch = blob.match(/my name is\s+([A-Za-z][A-Za-z .'-]{1,60})/i)
  if (nameMatch) result.name = nameMatch[1].replace(/[.,]+$/, '').trim()

  if (!result.name) {
    const confirm = blob.match(/that'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
    if (confirm) result.name = confirm[1].trim()
  }

  const phoneMatch = blob.match(
    /(\+92[\s-]?\d{3}[\s-]?\d{7}|0\d{3}[\s-]?\d{7}|0\d{2}[\s-]?\d{3}[\s-]?\d{4})/,
  )
  if (phoneMatch) result.phone = phoneMatch[1].replace(/\s+/g, ' ').trim()

  const emailMatch = blob.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  if (emailMatch) {
    result.email = emailMatch[0]
  } else {
    const dashed = blob.match(
      /((?:[A-Za-z]-)+[A-Za-z](?:\s+(?:[A-Za-z]-)+[A-Za-z])*)\s+dot\s+(\w+)\s+at\s+([A-Za-z0-9.]+)/i,
    )
    if (dashed) {
      const local = dashed[1].replace(/[-\s]/g, '').toLowerCase()
      result.email = `${local}.${dashed[2].toLowerCase()}@${dashed[3].toLowerCase()}`
    } else {
      const spoken = blob.match(
        /([a-z][a-z\s]+)\s+dot\s+([a-z0-9\s]+)\s+at\s+([a-z]+)\s+dot\s+([a-z]+)/i,
      )
      if (spoken) {
        const local = spoken[1].replace(/\s+/g, '').toLowerCase()
        const domain = `${spoken[3].toLowerCase()}.${spoken[4].toLowerCase()}`
        const afterDot = spokenDigits(spoken[2]) || spoken[2].replace(/\s+/g, '').toLowerCase()
        result.email = `${local}.${afterDot}@${domain}`
      }
    }
  }

  return result
}

function mapTranscript(call) {
  const utterances = Array.isArray(call?.transcript_object) ? call.transcript_object : []
  return utterances
    .filter((line) => line?.content && (line.role === 'agent' || line.role === 'user'))
    .map((line) => ({
      speaker: line.role === 'agent' ? 'Ali' : 'Caller',
      text: String(line.content).trim(),
      timestampSeconds: Number(line.words?.[0]?.start ?? 0),
    }))
}

function durationSeconds(call) {
  if (typeof call?.duration_ms === 'number') return Math.max(0, Math.round(call.duration_ms / 1000))
  if (call?.start_timestamp && call?.end_timestamp) {
    return Math.max(0, Math.round((call.end_timestamp - call.start_timestamp) / 1000))
  }
  return 0
}

export function mapCallToLog(call) {
  const analysis = call?.call_analysis ?? {}
  const custom = analysis.custom_analysis_data ?? {}
  const vars = call?.retell_llm_dynamic_variables ?? {}
  const metadata = call?.metadata ?? {}
  const transcript = mapTranscript(call)
  const extracted = extractFromTranscript(transcript)

  const name =
    pickCustom(custom, ['name', 'caller_name', 'customer_name', 'full_name', 'student_name']) ||
    pickCustom(vars, ['name', 'customer_name', 'caller_name']) ||
    pickCustom(metadata, ['name', 'customer_name']) ||
    extracted.name ||
    (call?.call_type === 'web_call' ? 'Web caller' : 'Caller')

  const phone =
    pickCustom(custom, ['phone', 'phone_number', 'mobile']) ||
    cleanValue(call?.from_number) ||
    cleanValue(call?.to_number) ||
    extracted.phone ||
    '—'

  const email =
    pickCustom(custom, ['email', 'email_address']) ||
    pickCustom(vars, ['email']) ||
    extracted.email ||
    '—'

  const enrollment =
    pickCustom(custom, [
      'enrollment',
      'enrollment_number',
      'enrollment_no',
      'enrolment',
      'student_id',
      'registration_number',
    ]) || '—'

  const startedAt = call?.start_timestamp
    ? new Date(call.start_timestamp).toISOString()
    : new Date().toISOString()

  return {
    id: call.call_id,
    name,
    phone,
    email,
    enrollment,
    duration_seconds: durationSeconds(call),
    started_at: startedAt,
    summary: analysis.call_summary ?? null,
    audio_url: call.recording_url ?? null,
    transcript,
    call_status: call.call_status ?? null,
    analyzed: Boolean(analysis.call_summary || analysis.user_sentiment),
    raw_payload: call,
  }
}

export function toClientCallLog(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    enrollment: row.enrollment ?? '—',
    durationSeconds: row.duration_seconds ?? 0,
    timestamp: row.started_at,
    summary: row.summary ?? null,
    audioUrl: row.audio_url ?? null,
    transcript: Array.isArray(row.transcript) ? row.transcript : [],
  }
}

function isWeak(value) {
  return !cleanValue(value) || ['web caller', 'caller', '—'].includes(String(value).trim().toLowerCase())
}

export async function persistCallLog(row) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: existing } = await supabase
    .from('call_logs')
    .select('name, phone, email, enrollment, summary, audio_url, transcript, analyzed, raw_payload')
    .eq('id', row.id)
    .maybeSingle()

  let audioUrl = row.audio_url
  if (
    audioUrl &&
    !audioUrl.includes('/storage/v1/object/public/call-recordings/')
  ) {
    const stored = await storeRecording(supabase, row.id, audioUrl)
    if (stored) audioUrl = stored
  }

  const payload = {
    ...row,
    name: isWeak(row.name) && existing?.name && !isWeak(existing.name) ? existing.name : row.name,
    phone: isWeak(row.phone) && existing?.phone && !isWeak(existing.phone) ? existing.phone : row.phone,
    email: isWeak(row.email) && existing?.email && !isWeak(existing.email) ? existing.email : row.email,
    enrollment:
      isWeak(row.enrollment) && existing?.enrollment && !isWeak(existing.enrollment)
        ? existing.enrollment
        : row.enrollment,
    summary: row.summary || existing?.summary || null,
    audio_url: audioUrl || existing?.audio_url || null,
    transcript:
      Array.isArray(row.transcript) && row.transcript.length > 0
        ? row.transcript
        : existing?.transcript ?? [],
    analyzed: Boolean(row.analyzed || existing?.analyzed),
    raw_payload: row.raw_payload?.call_analysis ? row.raw_payload : existing?.raw_payload || row.raw_payload,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('call_logs').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return payload
}

async function storeRecording(supabase, callId, sourceUrl) {
  try {
    const response = await fetch(sourceUrl)
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'audio/wav'
    const ext = contentType.includes('mpeg') ? 'mp3' : contentType.includes('mp4') ? 'm4a' : 'wav'
    const path = `${callId}.${ext}`

    const { error } = await supabase.storage.from('call-recordings').upload(path, buffer, {
      contentType,
      upsert: true,
    })
    if (error) {
      console.warn('Recording upload skipped:', error.message)
      return null
    }

    const { data } = supabase.storage.from('call-recordings').getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (error) {
    console.warn('Recording copy failed:', error)
    return null
  }
}

export async function listCallLogs() {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('call_logs')
    .select('id, name, phone, email, enrollment, duration_seconds, started_at, summary, audio_url, transcript, analyzed, call_status')
    .order('started_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toClientCallLog)
}

export async function fetchRemoteCall(callId, apiKey) {
  const response = await fetch(`https://api.retellai.com/v2/get-call/${encodeURIComponent(callId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Get call failed (${response.status}): ${details}`)
  }
  return response.json()
}

export async function syncCallFromRemote(callId, apiKey) {
  const call = await fetchRemoteCall(callId, apiKey)
  const row = mapCallToLog(call)
  await persistCallLog(row)
  return toClientCallLog(row)
}

function isAnalyzed(call) {
  const analysis = call?.call_analysis
  if (!analysis || typeof analysis !== 'object') return false
  return Boolean(
    analysis.custom_analysis_data ||
      analysis.call_summary ||
      typeof analysis.call_successful === 'boolean',
  )
}

export async function waitAndSyncCall(callId, apiKey, options = {}) {
  const attempts = options.attempts ?? (process.env.VERCEL ? 8 : 40)
  const delayMs = options.delayMs ?? 3000
  let last = null
  for (let i = 0; i < attempts; i += 1) {
    const call = await fetchRemoteCall(callId, apiKey)
    last = call
    if (isAnalyzed(call)) {
      const row = mapCallToLog(call)
      await persistCallLog(row)
      return toClientCallLog(row)
    }
    if (call?.transcript_object?.length || call?.recording_url) {
      await persistCallLog(mapCallToLog(call))
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  if (last) {
    const row = mapCallToLog(last)
    await persistCallLog(row)
    return toClientCallLog(row)
  }
  throw new Error('Call report was not ready yet')
}
