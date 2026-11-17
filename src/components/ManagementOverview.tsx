import { useEffect, useState } from 'react'
import { ClipboardCheck, UserCheck, UserRoundCog, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ManagementStats } from '@/types'
import { StatCard } from '@/components/StatCard'

const empty: ManagementStats = {
  activeMembers: 0,
  invitedMembers: 0,
  suspendedMembers: 0,
  pendingInvites: 0,
  totalCalls: 0,
  evaluatedCalls: 0,
  unevaluatedCalls: 0,
  evaluationRate: 0,
  verdicts: {},
  evaluationsEnabled: false,
}

export function ManagementOverview() {
  const [stats, setStats] = useState<ManagementStats>(empty)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await apiFetch('/api/management-stats')
        const data = (await response.json()) as { stats?: ManagementStats }
        if (!response.ok || cancelled || !data.stats) return
        setStats(data.stats)
      } catch {
        // ignore — shown only to admin roles via API 403 for front_desk
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const verdictLabel = Object.entries(stats.verdicts)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' · ')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Management</h2>
        <p className="text-sm text-muted-foreground">
          Team access and human review coverage (Super Admin / Admin).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active members"
          value={stats.activeMembers.toString()}
          subtitle="Current"
          showChart={false}
          icon={Users}
          data={[]}
        />
        <StatCard
          title="Pending invites"
          value={stats.pendingInvites.toString()}
          subtitle="Current"
          showChart={false}
          icon={UserRoundCog}
          data={[]}
        />
        <StatCard
          title="Review coverage"
          value={`${stats.evaluationRate}%`}
          subtitle="Of calls evaluated"
          showChart={false}
          icon={ClipboardCheck}
          data={[]}
        />
        <StatCard
          title="Unevaluated calls"
          value={stats.unevaluatedCalls.toString()}
          subtitle="In queue"
          showChart={false}
          icon={UserCheck}
          data={[]}
        />
      </div>
      {stats.evaluationsEnabled && verdictLabel ? (
        <p className="text-xs text-muted-foreground">Verdicts: {verdictLabel}</p>
      ) : null}
    </div>
  )
}