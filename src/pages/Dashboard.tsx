import { useEffect, useState } from 'react'
import { Clock3, Phone, Timer } from 'lucide-react'
import { IntentBreakdown } from '@/components/IntentBreakdown'
import { StatCard } from '@/components/StatCard'
import { TalkToAliButton } from '@/components/TalkToAliButton'
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
  const [stats, setStats] = useState<DashboardStats>(emptyStats)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/dashboard-stats')
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
        <p className="text-sm text-muted-foreground">
          Overview of call activity this week.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={totalCalls.toLocaleString()}
          icon={Phone}
          data={callsTrend}
          labels={labels}
        />
        <StatCard
          title="Average Minutes per Call"
          value={averageMinutesPerCall.toFixed(1)}
          icon={Clock3}
          data={avgMinutesTrend}
          labels={labels}
          valueFormatter={(v) => `${v.toFixed(1)} min`}
        />
        <StatCard
          title="Total Minutes Consumed"
          value={totalMinutesConsumed.toLocaleString()}
          icon={Timer}
          data={totalMinutesTrend}
          labels={labels}
          valueFormatter={(v) => `${v} min`}
        />
        <IntentBreakdown />
      </div>

      <TalkToAliButton />
    </div>
  )
}
