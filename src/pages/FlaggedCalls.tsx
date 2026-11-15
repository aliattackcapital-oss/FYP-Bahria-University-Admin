import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { ADMIN_FLAG_STATUS_LABELS } from '@/lib/evaluationQuestions'
import type { FlaggedCallSummary } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

export function FlaggedCalls() {
  const { orgRole } = useAuth()
  const [flags, setFlags] = useState<FlaggedCallSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await apiFetch('/api/flagged-calls')
        const data = (await response.json()) as { flags?: FlaggedCallSummary[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) setFlags(data.flags ?? [])
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
  }, [])

  if (orgRole !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  const open = flags.filter((f) => f.status !== 'resolved')
  const resolved = flags.filter((f) => f.status === 'resolved')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flagged calls</h1>
        <p className="text-sm text-muted-foreground">
          Officer evaluations flagged for super admin follow-up.
        </p>
      </div>

      {loading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <FlagSection title="Open" items={open} empty="No open flags." />
          <FlagSection title="Resolved" items={resolved} empty="No resolved flags yet." />
        </>
      )}
    </div>
  )
}

function FlagSection({
  title,
  items,
  empty,
}: {
  title: string
  items: FlaggedCallSummary[]
  empty: string
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{item.callName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.callId} · {formatDate(item.callDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Officer: {item.reviewerName ?? '—'} · Avg{' '}
                  {item.averageRating != null ? item.averageRating.toFixed(2) : '—'} / 5
                </p>
                <p className="text-sm">{item.flagReason}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={item.flagPriority === 'urgent' ? 'destructive' : 'secondary'}>
                  {item.flagPriority === 'urgent' ? 'Urgent' : 'Normal'}
                </Badge>
                <Badge variant="outline">
                  {ADMIN_FLAG_STATUS_LABELS[item.status] ?? item.status}
                </Badge>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/flagged-calls/${item.id}`}>Review</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}