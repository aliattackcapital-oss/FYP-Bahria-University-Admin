import { useEffect, useState } from 'react'
import { Clock3, Phone, Timer } from 'lucide-react'
import { ManagementOverview } from '@/components/ManagementOverview'
import { IntentBreakdown } from '@/components/IntentBreakdown'
import { StatCard } from '@/components/StatCard'
import { useAuth } from '@/contexts/AuthContext'
import { TalkToAliButton } from '@/components/TalkToAliButton'
import { apiFetch } from '@/lib/api'
import type { DashboardStats } from '@/types'

const emptyStats: DashboardStats = {
  totalCalls: 0,
  averageMinutesPerCall: 0,
  totalMinutesConsumed: 0,
  callsTrend: [0, 0, 0, 0, 0, 0, 0],
  avgMinutesTrend: [0, 0, 0, 0, 0, 0, 0],
  totalMinutesTrend: [0, 0, 0, 0, 0, 0, 0],
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

export function Dashboard() {
  const { orgRole } = useAuth()
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const showManagement = orgRole === 'super_admin' || orgRole === 'admin'
  const pageSubtitle =
    orgRole === 'super_admin'
      ? 'Organization call activity, team metrics, and voice agent access.'
      : 'Overview of call activity this week.'

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await apiFetch('/api/dashboard-stats')
        const data = (await response.json()) as { stats?: DashboardStats }
        if (!response.ok || cancelled || !data.stats) return
        setStats(data.stats)
      } catch {
        // keep zeros
      }
    }

    void load()
    const onUpdated = () => void load()
    window.addEventListener('call-logs-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('call-logs-updated', onUpdated)
    }
  }, [])

  const {
    totalCalls,
    averageMinutesPerCall,
    totalMinutesConsumed,
    callsTrend,
    avgMinutesTrend,
    totalMinutesTrend,
    labels,
  } = stats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={totalCalls.toLocaleString()}
          subtitle="All completed calls"
          chartCaption="Last 7 days"
          icon={Phone}
          data={callsTrend}
          labels={labels}
        />
        <StatCard
          title="Average Minutes per Call"
          value={averageMinutesPerCall.toFixed(1)}
          subtitle="All-time average"
          chartCaption="Last 7 days"
          icon={Clock3}
          data={avgMinutesTrend}
          labels={labels}
          valueFormatter={(v) => `${v.toFixed(1)} min`}
        />
        <StatCard
          title="Total Minutes Consumed"
          value={totalMinutesConsumed.toLocaleString()}
          subtitle="All-time minutes"
          chartCaption="Last 7 days"
          icon={Timer}
          data={totalMinutesTrend}
          labels={labels}
          valueFormatter={(v) => `${v} min`}
        />
        <IntentBreakdown />
      </div>

      {showManagement ? <ManagementOverview /> : null}

      <TalkToAliButton />
    </div>
  )
}
