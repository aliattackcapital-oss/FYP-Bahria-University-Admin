export interface TranscriptLine {
  speaker: 'Ali' | 'Caller'
  text: string
  timestampSeconds: number
}

export type ReviewTaskStatus =
  | 'processing'
  | 'unassigned'
  | 'assigned'
  | 'in_review'
  | 'completed'

export type ReviewQueueFilter = 'unassigned' | 'mine' | 'open'

export interface ReviewQueueTask {
  id: string
  callId: string
  status: ReviewTaskStatus
  assignedMemberId: string | null
  assigneeName: string | null
  claimedAt: string | null
  completedAt: string | null
  createdAt: string
  call: {
    name: string
    phone: string
    intent: string
    durationSeconds: number
    timestamp: string
    analyzed: boolean
    summary: string | null
  } | null
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

export type MemberRole =
  | 'Super Admin'
  | 'Admin'
  | 'Front Desk'
  | 'Academic'
  | 'IT'
export type MemberStatus = 'Active' | 'Invited' | 'Suspended'

export interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  orgRole?: 'super_admin' | 'admin' | 'front_desk'
  department: string
  status: MemberStatus
  orgStatus?: 'active' | 'invited' | 'suspended'
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

export type EvaluationVerdict =
  | 'correct'
  | 'partially_correct'
  | 'incorrect'
  | 'unable_to_assess'

export interface CallEvaluation {
  id: string
  call_id: string
  verdict: EvaluationVerdict
  notes: string | null
  reviewer_member_id: string | null
  created_at: string
  updated_at: string
}

export interface ManagementStats {
  activeMembers: number
  invitedMembers: number
  suspendedMembers: number
  pendingInvites: number
  totalCalls: number
  evaluatedCalls: number
  unevaluatedCalls: number
  evaluationRate: number
  verdicts: Record<string, number>
  evaluationsEnabled: boolean
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

export type KnowledgeBaseStatus =
  | 'in_progress'
  | 'complete'
  | 'error'
  | 'refreshing_in_progress'

export interface KnowledgeBaseSource {
  type: 'document' | 'text' | 'url'
  source_id: string
  filename?: string
  file_url?: string
  file_size?: number
  title?: string
  url?: string
}
