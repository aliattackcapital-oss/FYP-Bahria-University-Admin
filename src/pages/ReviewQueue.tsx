import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiFetch } from '@/lib/api'
import type { ReviewQueueTask, ReviewQueueFilter } from '@/types'

function statusLabel(status: ReviewQueueTask['status']) {
  const map: Record<string, string> = {
    processing: 'Processing',
    unassigned: 'Unassigned',
    assigned: 'Assigned',
    in_review: 'In review',
    completed: 'Completed',
  }
  return map[status] ?? status
}

export function ReviewQueue() {
  const navigate = useNavigate()
  const { isSuperAdmin, orgRole } = useAuth()
  const canBackfill = isSuperAdmin || orgRole === 'admin'
  const [filter, setFilter] = useState<ReviewQueueFilter>('unassigned')
  const [tasks, setTasks] = useState<ReviewQueueTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schemaHint, setSchemaHint] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch(`/api/review-queue?filter=${encodeURIComponent(filter)}`)
      const data = (await response.json()) as {
        tasks?: ReviewQueueTask[]
        error?: string
        schemaReady?: boolean
        hint?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load queue')
      setTasks(data.tasks ?? [])
      setSchemaHint(data.schemaReady === false ? data.hint ?? null : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 20000)
    return () => window.clearInterval(id)
  }, [load])

  const handleClaim = async (callId: string) => {
    setBusyId(callId)
    setError(null)
    try {
      const response = await apiFetch('/api/review-queue/claim', {
        method: 'POST',
        body: JSON.stringify({ callId }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not claim')
      setFilter('mine')
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleReview = async (callId: string) => {
    setBusyId(callId)
    try {
      await apiFetch('/api/review-queue/start', {
        method: 'POST',
        body: JSON.stringify({ callId }),
      })
      navigate(`/call-logs?callId=${encodeURIComponent(callId)}`)
    } finally {
      setBusyId(null)
    }
  }

  const handleBackfill = async () => {
    setError(null)
    const response = await apiFetch('/api/review-queue/backfill', { method: 'POST' })
    const data = (await response.json()) as { error?: string; scanned?: number }
    if (!response.ok) {
      setError(data.error || 'Backfill failed')
      return
    }
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review queue</h1>
          <p className="text-sm text-muted-foreground">
            Claim completed calls, then review them from Call Logs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === 'unassigned' ? 'default' : 'outline'}
            onClick={() => setFilter('unassigned')}
          >
            Unassigned
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === 'mine' ? 'default' : 'outline'}
            onClick={() => setFilter('mine')}
          >
            My reviews
          </Button>
          {canBackfill ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void handleBackfill()}>
              Backfill tasks
            </Button>
          ) : null}
        </div>
      </div>

      {schemaHint ? (
        <Alert>
          <AlertDescription>
            Run migration in Supabase: <code className="text-xs">{schemaHint}</code>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === 'unassigned'
            ? 'No calls waiting for review. New tasks appear after calls complete.'
            : 'Nothing assigned to you yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.call?.name ?? task.callId}</p>
                    <p className="text-xs text-muted-foreground">{task.call?.phone ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.call?.intent ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabel(task.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.assigneeName ?? '—'}
                  </TableCell>
                  <TableCell className="text-end">
                    {filter === 'unassigned' && task.status === 'unassigned' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === task.callId}
                        onClick={() => void handleClaim(task.callId)}
                      >
                        {busyId === task.callId ? <Loader2 className="animate-spin" /> : <UserCheck />}
                        Claim
                      </Button>
                    ) : filter === 'mine' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === task.callId}
                        onClick={() => void handleReview(task.callId)}
                      >
                        Review
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}