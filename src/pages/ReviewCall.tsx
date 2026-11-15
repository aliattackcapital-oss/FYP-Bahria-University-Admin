import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AudioPlayer } from '@/components/AudioPlayer'
import { CallReviewForm } from '@/components/CallReviewForm'
import { TranscriptView } from '@/components/TranscriptView'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import type { CallLog } from '@/types'

export function ReviewCall() {
  const { callId } = useParams<{ callId: string }>()
  const { orgRole } = useAuth()
  const [log, setLog] = useState<CallLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!callId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        await apiFetch('/api/review-queue/start', {
          method: 'POST',
          body: JSON.stringify({ callId }),
        })
        const response = await apiFetch(
          `/api/call-logs/detail?callId=${encodeURIComponent(callId)}&forReview=1`,
        )
        const data = (await response.json()) as { log?: CallLog; error?: string }
        if (!response.ok) throw new Error(data.error || 'Could not load call')
        if (!cancelled) setLog(data.log ?? null)
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
  }, [callId])

  if (orgRole !== 'front_desk') {
    return <Navigate to="/" replace />
  }

  if (!callId) return <Navigate to="/review-queue" replace />

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/review-queue">
          <ArrowLeft className="size-4" />
          Back to queue
        </Link>
      </Button>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : log ? (
        <>
          <header className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Call review
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{log.name}</h1>
            <p className="text-sm text-muted-foreground">
              {log.intent} · {log.phone} · {Math.round(log.durationSeconds / 60)}m
            </p>
          </header>

          {log.summary ? (
            <p className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
              {log.summary}
            </p>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Recording</h2>
            <AudioPlayer src={log.audioUrl} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Transcript</h2>
            <div className="max-h-64 overflow-y-auto rounded-xl border p-3">
              <TranscriptView lines={log.transcript} />
            </div>
          </section>

          <CallReviewForm callId={callId} />
        </>
      ) : null}
    </div>
  )
}