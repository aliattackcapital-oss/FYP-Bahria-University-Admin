import { getSupabaseAdmin } from './supabase.js'

const PLACEHOLDER =
  /^(not given|n\/a|na|none|unknown|null|undefined|empty|blank|not detected|no intent|—|-)$/i

const INTENT_KEYS = ['intent', 'category', 'topic', 'query_type', 'call_intent']

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

const INTENT_LABELS = {
  admissions: 'Admissions',
  fees: 'Fees & finance',
  finance: 'Fees & finance',
  'fees & finance': 'Fees & finance',
  'fees and finance': 'Fees & finance',
  academics: 'Academics & timetable',
  timetable: 'Academics & timetable',
  academic: 'Academics & timetable',
  'academics & timetable': 'Academics & timetable',
  'academics and timetable': 'Academics & timetable',
}

function normalizeIntent(value) {
  const cleaned = cleanValue(value)
  if (!cleaned) return ''
  const key = cleaned.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return INTENT_LABELS[key] || cleaned
}

function pickCustom(data, keys) {
  const picked = pickCustomField(data, keys)
  return picked.found ? picked.value : ''
}

function pickCustomField(data, keys) {
  if (!data || typeof data !== 'object') return { found: false, value: '' }
  for (const key of keys) {
    const match = Object.entries(data).find(([k]) => k.toLowerCase() === key)
    if (!match) continue
    const raw = match[1]
    return { found: true, value: cleanValue(raw == null ? '' : String(raw)) }
  }
  return { found: false, value: '' }
}

function hasCustomKey(data, keys) {
  return pickCustomField(data, keys).found
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

  const nameField = pickCustomField(custom, [
    'name',
    'caller_name',
    'customer_name',
    'full_name',
    'student_name',
  ])
  const phoneField = pickCustomField(custom, ['phone', 'phone_number', 'mobile'])
  const emailField = pickCustomField(custom, ['email', 'email_address'])
  const enrollmentField = pickCustomField(custom, [
    'enrollment',
    'enrollment_number',
    'enrollment_no',
    'enrolment',
    'student_id',
    'registration_number',
  ])
  const intentField = pickCustomField(custom, INTENT_KEYS)

  const name = nameField.found
    ? nameField.value || '—'
    : pickCustom(vars, ['name', 'customer_name', 'caller_name']) ||
      pickCustom(metadata, ['name', 'customer_name']) ||
      extracted.name ||
      (call?.call_type === 'web_call' ? 'Web caller' : 'Caller')

  const phone = phoneField.found
    ? phoneField.value || '—'
    : cleanValue(call?.from_number) ||
      cleanValue(call?.to_number) ||
      extracted.phone ||
      '—'

  const email = emailField.found
    ? emailField.value || '—'
    : pickCustom(vars, ['email']) || extracted.email || '—'

  const enrollment = enrollmentField.found
    ? enrollmentField.value || '—'
    : '—'

  const intent = intentField.found
    ? normalizeIntent(intentField.value) || '—'
    : '—'

  const startedAt = call?.start_timestamp
    ? new Date(call.start_timestamp).toISOString()
    : new Date().toISOString()

  return {
    id: call.call_id,
    name,
    phone,
    email,
    enrollment,
    intent,
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
    intent: row.intent ?? '—',
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

function keepUnlessAnalysisEmpty(incoming, existing, analysisSentField) {
  if (analysisSentField && isWeak(incoming)) return '—'
  if (isWeak(incoming) && existing && !isWeak(existing)) return existing
  return incoming || '—'
}

export async function persistCallLog(row) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: existing } = await supabase
    .from('call_logs')
    .select('name, phone, email, enrollment, intent, summary, audio_url, transcript, analyzed, raw_payload')
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
    name: keepUnlessAnalysisEmpty(
      row.name,
      existing?.name,
      hasCustomKey(row.raw_payload?.call_analysis?.custom_analysis_data, [
        'name',
        'caller_name',
        'customer_name',
        'full_name',
        'student_name',
      ]),
    ),
    phone: keepUnlessAnalysisEmpty(
      row.phone,
      existing?.phone,
      hasCustomKey(row.raw_payload?.call_analysis?.custom_analysis_data, [
        'phone',
        'phone_number',
        'mobile',
      ]),
    ),
    email: keepUnlessAnalysisEmpty(
      row.email,
      existing?.email,
      hasCustomKey(row.raw_payload?.call_analysis?.custom_analysis_data, [
        'email',
        'email_address',
      ]),
    ),
    enrollment: keepUnlessAnalysisEmpty(
      row.enrollment,
      existing?.enrollment,
      hasCustomKey(row.raw_payload?.call_analysis?.custom_analysis_data, [
        'enrollment',
        'enrollment_number',
        'enrollment_no',
        'enrolment',
        'student_id',
        'registration_number',
      ]),
    ),
    intent: keepUnlessAnalysisEmpty(
      row.intent,
      existing?.intent,
      hasCustomKey(row.raw_payload?.call_analysis?.custom_analysis_data, INTENT_KEYS),
    ),
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

function emptyDashboardStats(labels) {
  return {
    totalCalls: 0,
    averageMinutesPerCall: 0,
    totalMinutesConsumed: 0,
    callsTrend: labels.map(() => 0),
    avgMinutesTrend: labels.map(() => 0),
    totalMinutesTrend: labels.map(() => 0),
    labels,
  }
}

function lastSevenUtcDays() {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    )
    days.push(date.toISOString().slice(0, 10))
  }
  return days
}

function weekdayLabel(isoDay) {
  const [year, month, day] = isoDay.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}

function isCompletedCall(row) {
  return (row.duration_seconds ?? 0) > 0 && row.call_status !== 'ongoing'
}

export async function getDashboardStats() {
  const labels = lastSevenUtcDays().map(weekdayLabel)
  if (!getSupabaseAdmin()) return emptyDashboardStats(labels)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('call_logs')
    .select('duration_seconds, started_at, call_status')

  if (error) throw new Error(error.message)

  const rows = (data ?? []).filter(isCompletedCall)
  const totalSeconds = rows.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0)
  const totalMinutes = totalSeconds / 60
  const totalCalls = rows.length

  const days = lastSevenUtcDays()
  const byDay = Object.fromEntries(
    days.map((day) => [day, { count: 0, seconds: 0 }]),
  )
  for (const row of rows) {
    const day = row.started_at ? new Date(row.started_at).toISOString().slice(0, 10) : ''
    if (!byDay[day]) continue
    byDay[day].count += 1
    byDay[day].seconds += row.duration_seconds ?? 0
  }

  return {
    totalCalls,
    averageMinutesPerCall: totalCalls ? totalMinutes / totalCalls : 0,
    totalMinutesConsumed: Math.round(totalMinutes),
    callsTrend: days.map((day) => byDay[day].count),
    avgMinutesTrend: days.map((day) => {
      const bucket = byDay[day]
      return bucket.count ? bucket.seconds / 60 / bucket.count : 0
    }),
    totalMinutesTrend: days.map((day) => Math.round(byDay[day].seconds / 60)),
    labels: days.map(weekdayLabel),
  }
}

export async function listCallLogs() {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('call_logs')
    .select('id, name, phone, email, enrollment, intent, duration_seconds, started_at, summary, audio_url, transcript, analyzed, call_status')
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
