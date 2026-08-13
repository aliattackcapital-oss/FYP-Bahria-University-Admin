export interface TranscriptLine {
  speaker: 'Ali' | 'Caller'
  text: string
  timestampSeconds: number
}

export interface CallLog {
  id: string
  name: string
  phone: string
  email: string
  enrollment: string
  intent: string
  durationSeconds: number
  timestamp: string
  summary: string | null
  audioUrl: string | null
  transcript: TranscriptLine[]
}

export type CallStatus = 'idle' | 'connecting' | 'in_call' | 'ended'

export type MemberRole = 'Admin' | 'Front Desk' | 'Academic' | 'IT'
export type MemberStatus = 'Active' | 'Invited'

export interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  department: string
  status: MemberStatus
  joinedAt: string
}

export type CreatorRole = 'student' | 'supervisor'

export interface Creator {
  id: string
  name: string
  enrollment?: string
  role: CreatorRole
  /** Filename under `public/creators/`, e.g. `ali-rashid.jpg` */
  photo: string
}

export interface DashboardStats {
  totalCalls: number
  averageMinutesPerCall: number
  totalMinutesConsumed: number
  callsTrend: number[]
  avgMinutesTrend: number[]
  totalMinutesTrend: number[]
  labels: string[]
}
