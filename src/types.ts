export interface TranscriptLine {
  speaker: 'Sarah' | 'Caller'
  text: string
  timestampSeconds: number
}

export interface CallLog {
  id: string
  name: string
  phone: string
  email: string
  durationSeconds: number
  timestamp: string
  audioUrl: string | null
  transcript: TranscriptLine[]
}

export type CallStatus = 'idle' | 'connecting' | 'in_call' | 'ended'

export interface DashboardStats {
  totalCalls: number
  averageMinutesPerCall: number
  totalMinutesConsumed: number
  callsTrend: number[]
  avgMinutesTrend: number[]
  totalMinutesTrend: number[]
  labels: string[]
}
