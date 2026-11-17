import { useCallback, useEffect, useState } from 'react'
import { Clock3, DollarSign, Loader2, Phone, Timer } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { PlatformUsageStats } from '@/types'

const ALL_ORGS = 'all'

const emptyUsage: PlatformUsageStats = {
  costPerMinute: 0.3,
  selectedOrganizationId: null,
  selectedOrganization: null,
  organizations: [],
  overall: {
    totalCalls: 0,
    averageMinutesPerCall: 0,
    totalMinutesConsumed: 0,
    estimatedCostUsd: 0,
    callsTrend: [0, 0, 0, 0, 0, 0, 0],
    avgMinutesTrend: [0, 0, 0, 0, 0, 0, 0],
    totalMinutesTrend: [0, 0, 0, 0, 0, 0, 0],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  byOrganization: [],
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function PlatformUsageOverview() {
  const [filter, setFilter] = useState(ALL_ORGS)
  const [usage, setUsage] = useState<PlatformUsageStats>(emptyUsage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const path =
        filter === ALL_ORGS
          ? '/api/platform/usage'
          : `/api/platform/usage?organizationId=${encodeURIComponent(filter)}`
      const response = await apiFetch(path)
      const data = (await response.json()) as { usage?: PlatformUsageStats; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load usage')
      setUsage(data.usage ?? emptyUsage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
    const onRefresh = () => void load()
    window.addEventListener('platform-usage-updated', onRefresh)
    return () => window.removeEventListener('platform-usage-updated', onRefresh)
  }, [load])

  const { overall, byOrganization, costPerMinute, selectedOrganization, organizations } = usage
  const scopeLabel = selectedOrganization?.name ?? 'All organizations'
  const scopeSlug = selectedOrganization ? selectedOrganization.slug : 'all tenants'

  const selectClassName = cn(
    'h-9 min-w-[12rem] max-w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'dark:bg-input/30',
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4 sm:gap-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Usage</h2>
        <p className="text-sm text-muted-foreground">
          Completed calls · ${costPerMinute.toFixed(2)}/min · all time
        </p>
        <div className="flex items-baseline gap-2 sm:ml-auto">
          <label
            htmlFor="platform-org-filter"
            className="shrink-0 text-sm text-muted-foreground"
          >
            Organization
          </label>
          <select
            id="platform-org-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={selectClassName}
          >
            <option value={ALL_ORGS}>All organizations</option>
            {organizations.map((org) => (
              <option key={org.organizationId} value={org.organizationId}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading usage…
        </p>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total calls"
              value={overall.totalCalls.toLocaleString()}
              subtitle={`${scopeLabel} · completed · all time`}
              chartCaption="Last 7 days"
              icon={Phone}
              data={overall.callsTrend}
              labels={overall.labels}
            />
            <StatCard
              title="Avg minutes per call"
              value={overall.averageMinutesPerCall.toFixed(1)}
              subtitle={`${scopeSlug} · all-time avg`}
              chartCaption="Last 7 days"
              icon={Clock3}
              data={overall.avgMinutesTrend}
              labels={overall.labels}
              valueFormatter={(v) => `${v.toFixed(1)} min`}
            />
            <StatCard
              title="Total minutes"
              value={overall.totalMinutesConsumed.toLocaleString()}
              subtitle={`${scopeSlug} · all time`}
              chartCaption="Last 7 days"
              icon={Timer}
              data={overall.totalMinutesTrend}
              labels={overall.labels}
              valueFormatter={(v) => `${v} min`}
            />
            <StatCard
              title="Estimated cost"
              value={formatUsd(overall.estimatedCostUsd)}
              subtitle={`@${costPerMinute.toFixed(2)}/min · ${scopeSlug} · all time`}
              chartCaption="Last 7 days (minutes × rate)"
              icon={DollarSign}
              data={overall.totalMinutesTrend.map((m) => m * costPerMinute)}
              labels={overall.labels}
              valueFormatter={(v) => formatUsd(v)}
            />
          </div>

          {filter === ALL_ORGS && byOrganization.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Organization</th>
                    <th className="px-4 py-2.5 font-medium text-right">Calls</th>
                    <th className="px-4 py-2.5 font-medium text-right">Avg min</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total min</th>
                    <th className="px-4 py-2.5 font-medium text-right">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {byOrganization.map((row) => (
                    <tr key={row.organizationId}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.slug}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.totalCalls.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.averageMinutesPerCall.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.totalMinutesConsumed.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatUsd(row.estimatedCostUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}