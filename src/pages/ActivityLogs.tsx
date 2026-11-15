import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronRight, Flag, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ActivityKpiStrip } from '@/components/ActivityKpiStrip'
import { ActivityLogDetailDialog } from '@/components/ActivityLogDetailDialog'
import { apiFetch } from '@/lib/api'
import { activityListSummary } from '@/lib/activityLabels'
import type { ActivityLogEntry, FrontDeskActivityStats } from '@/types'
import { Badge } from '@/components/ui/badge'

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function actionLabel(_action: string) {
  return 'Evaluation'
}

const emptyStats: FrontDeskActivityStats = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  activeOfficers: 0,
  evaluationsThisWeek: 0,
  claimsThisWeek: 0,
  flagsRaisedThisWeek: 0,
  openFlags: 0,
  evaluationsTrend: [0, 0, 0, 0, 0, 0, 0],
  claimsTrend: [0, 0, 0, 0, 0, 0, 0],
  officerLeaderboard: [],
  maxOfficerEval: 1,
}

export function ActivityLogs() {
  const { orgRole } = useAuth()
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [stats, setStats] = useState<FrontDeskActivityStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null)

  useEffect(() => {
    if (orgRole !== 'super_admin') return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [activityRes, statsRes] = await Promise.all([
          apiFetch('/api/activity-logs?scope=front_desk'),
          apiFetch('/api/activity-logs/stats'),
        ])
        const activityData = (await activityRes.json()) as {
          logs?: ActivityLogEntry[]
          error?: string
        }
        const statsData = (await statsRes.json()) as {
          stats?: FrontDeskActivityStats
          error?: string
        }
        if (!activityRes.ok) throw new Error(activityData.error || 'Failed to load activity')
        if (!statsRes.ok) throw new Error(statsData.error || 'Failed to load stats')
        if (!cancelled) {
          setLogs(activityData.logs ?? [])
          setStats(statsData.stats ?? emptyStats)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgRole])

  if (orgRole !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-[calc(100svh-7rem)] min-h-[32rem] flex-col gap-4">
      <header className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Front desk activity</h1>
        <p className="text-sm text-muted-foreground">
          Evaluation summary — tap a row for call and score details.
        </p>
      </header>

      {error ? <p className="shrink-0 text-sm text-destructive">{error}</p> : null}

      <section className="shrink-0" aria-label="Front desk KPIs">
        {loading ? (
          <div className="grid min-h-[7rem] place-items-center rounded-xl border bg-card">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ActivityKpiStrip stats={stats} />
        )}
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <h2 className="shrink-0 text-sm font-semibold text-foreground">Activity log</h2>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
          {loading ? null : logs.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No evaluations yet. Completed front desk reviews will appear here.
            </p>
          ) : (
            <ul className="h-full divide-y overflow-y-auto">
              {logs.map((entry) => {
                const summary = activityListSummary(entry.action, entry.metadata)
                const isFlagged =
                  Boolean(entry.metadata?.flagForAdmin ?? entry.metadata?.flag_for_admin) ||
                  summary.toLowerCase().includes('flagged')
                return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50"
                    onClick={() => setSelected(entry)}
                  >
                    <div className="w-24 shrink-0 text-xs text-muted-foreground">
                      {formatWhen(entry.createdAt)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {entry.actor?.name ?? 'Officer'}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {actionLabel(entry.action)}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{summary}</p>
                    </div>
                    <p className="flex shrink-0 items-center gap-2">
                      {isFlagged ? (
                        <Flag
                          className="size-4 fill-destructive text-destructive"
                          aria-label="Flagged for admin review"
                        />
                      ) : null}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </p>
                  </button>
                </li>
              )})}
            </ul>
          )}
        </div>
      </section>

      <ActivityLogDetailDialog
        entry={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}