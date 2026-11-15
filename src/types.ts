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

export type ReviewQueueFilter = 'unassigned' | 'mine_open' | 'mine_finished' | 'mine' | 'open'

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
  verdict?: EvaluationVerdict | null
  notes?: string | null
  rating_q1?: number | null
  rating_q2?: number | null
  rating_q3?: number | null
  rating_q4?: number | null
  rating_q5?: number | null
  average_rating?: number | null
  suggestions?: string | null
  flag_for_admin?: boolean
  flag_priority?: 'normal' | 'urgent' | null
  flag_reason?: string | null
  reviewer_member_id: string | null
  created_at: string
  updated_at: string
}

export type AdminFlagStatus =
  | 'flagged'
  | 'under_review'
  | 'changes_implemented'
  | 'resolved'

export interface ActivityLogActor {
  id: string
  name: string
  email: string
  role: string
}

export interface FrontDeskOfficerStat {
  id: string
  name: string
  email: string
  evaluations: number
  claims: number
}

export interface FrontDeskActivityStats {
  labels: string[]
  activeOfficers: number
  evaluationsThisWeek: number
  claimsThisWeek: number
  flagsRaisedThisWeek: number
  openFlags: number
  evaluationsTrend: number[]
  claimsTrend: number[]
  officerLeaderboard: FrontDeskOfficerStat[]
  maxOfficerEval: number
}

export interface ActivityLogEntry {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  actor: ActivityLogActor | null
}

export interface FlaggedCallSummary {
  id: string
  callId: string
  callName: string
  callDate: string
  status: AdminFlagStatus
  averageRating: number | null
  flagPriority: string
  flagReason: string | null
  reviewerName: string | null
  createdAt: string
  updatedAt: string
  evaluationId: string | null
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
