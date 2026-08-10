import { Clock3, Phone, Timer } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { TalkToAliButton } from '@/components/TalkToAliButton'
import { dashboardStats } from '@/lib/mockData'

export function Dashboard() {
  const {
    totalCalls,
    averageMinutesPerCall,
    totalMinutesConsumed,
    callsTrend,
    avgMinutesTrend,
    totalMinutesTrend,
    labels,
  } = dashboardStats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of Ali&apos;s call activity this week.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </div>

      <TalkToAliButton />
    </div>
  )
}
