import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import type { ReviewQueueTask, ReviewQueueFilter } from '@/types'
import { cn } from '@/lib/utils'

type TopTab = 'available' | 'my_calls'
type MyCallsSub = 'mine_open' | 'mine_finished'

function filterForTab(top: TopTab, sub: MyCallsSub): ReviewQueueFilter {
  return top === 'available' ? 'unassigned' : sub
}

export function ReviewQueue() {
  const { orgRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'finished' ? 'my_calls' : 'available'
  const initialSub: MyCallsSub = searchParams.get('tab') === 'finished' ? 'mine_finished' : 'mine_open'
  const [topTab, setTopTab] = useState<TopTab>(initialTab)
  const [mySub, setMySub] = useState<MyCallsSub>(initialSub)
  const filter = filterForTab(topTab, mySub)
  const [tasks, setTasks] = useState<ReviewQueueTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch(`/api/review-queue?filter=${encodeURIComponent(filter)}`)
      const data = (await response.json()) as { tasks?: ReviewQueueTask[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load queue')
      setTasks(data.tasks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (searchParams.get('tab') === 'finished') {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const claim = async (callId: string) => {
    setBusyId(callId)
    setError(null)
    try {
      const response = await apiFetch('/api/review-queue/claim', {
        method: 'POST',
        body: JSON.stringify({ callId }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not claim')
      setTopTab('my_calls')
      setMySub('mine_open')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setBusyId(null)
    }
  }

  if (orgRole !== 'front_desk') {
    return <Navigate to="/" replace />
  }

  const emptyMessage =
    topTab === 'available'
      ? 'No calls waiting. New ones appear after a conversation ends.'
      : mySub === 'mine_open'
        ? 'Nothing open. Claim a call from Available or finish an evaluation in progress.'
        : 'No finished evaluations yet. Submit a review to see calls here.'

  const showClaim = topTab === 'available'
  const isFinished = topTab === 'my_calls' && mySub === 'mine_finished'

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Calls to review</h1>
        <p className="text-sm text-muted-foreground">
          Claim from the pool, evaluate open calls, and revisit finished reviews.
        </p>
      </header>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={topTab === 'available' ? 'default' : 'outline'}
            onClick={() => setTopTab('available')}
          >
            Available
          </Button>
          <Button
            type="button"
            size="sm"
            variant={topTab === 'my_calls' ? 'default' : 'outline'}
            onClick={() => setTopTab('my_calls')}
          >
            My calls
          </Button>
        </div>

        {topTab === 'my_calls' ? (
          <div
            className="flex gap-1 rounded-lg border bg-muted/30 p-1"
            role="tablist"
            aria-label="My calls"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mySub === 'mine_open'}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mySub === 'mine_open'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setMySub('mine_open')}
            >
              Open to evaluate
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mySub === 'mine_finished'}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mySub === 'mine_finished'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setMySub('mine_finished')}
            >
              Finished
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{task.call?.name ?? task.callId}</p>
                <p className="text-xs text-muted-foreground">
                  {task.call?.intent ?? '—'} · {task.call?.phone ?? '—'}
                </p>
                {isFinished && task.completedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Finished {new Date(task.completedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              {showClaim ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === task.callId}
                  onClick={() => void claim(task.callId)}
                >
                  {busyId === task.callId ? <Loader2 className="animate-spin" /> : null}
                  Claim
                </Button>
              ) : (
                <Button type="button" size="sm" variant="secondary" asChild>
                  <Link to={`/review-queue/${encodeURIComponent(task.callId)}`}>
                    {isFinished ? 'View' : 'Evaluate'}
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}