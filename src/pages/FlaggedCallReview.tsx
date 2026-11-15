import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AudioPlayer } from '@/components/AudioPlayer'
import { TranscriptView } from '@/components/TranscriptView'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import { ADMIN_FLAG_STATUS_LABELS, EVALUATION_QUESTIONS, LIKERT_OPTIONS } from '@/lib/evaluationQuestions'
import type { CallLog } from '@/types'

type EvaluationPayload = {
  rating_q1?: number
  rating_q2?: number
  rating_q3?: number
  rating_q4?: number
  rating_q5?: number
  average_rating?: number
  suggestions?: string | null
  flag_reason?: string | null
  flag_priority?: string | null
  organization_members?: { display_name?: string; email?: string }
}

type FlagPayload = {
  id: string
  call_id: string
  status: string
  admin_notes?: string | null
  changes_documented?: string | null
  call_evaluations?: EvaluationPayload
}

type HistoryRow = {
  from_status: string | null
  to_status: string
  admin_notes?: string | null
  changes_documented?: string | null
  created_at: string
  organization_members?: { display_name?: string; email?: string }
}

const STATUSES = ['flagged', 'under_review', 'changes_implemented', 'resolved'] as const

export function FlaggedCallReview() {
  const { flagId } = useParams<{ flagId: string }>()
  const { orgRole } = useAuth()
  const [flag, setFlag] = useState<FlagPayload | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [log, setLog] = useState<CallLog | null>(null)
  const [status, setStatus] = useState<string>('flagged')
  const [adminNotes, setAdminNotes] = useState('')
  const [changesDocumented, setChangesDocumented] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!flagId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const response = await apiFetch(
          `/api/flagged-calls/detail?flagId=${encodeURIComponent(flagId)}`,
        )
        const data = (await response.json()) as {
          flag?: FlagPayload
          history?: HistoryRow[]
          log?: CallLog
          error?: string
        }
        if (!response.ok) throw new Error(data.error || 'Failed to load')
        if (cancelled) return
        setFlag(data.flag ?? null)
        setHistory(data.history ?? [])
        setLog(data.log ?? null)
        if (data.flag) {
          setStatus(data.flag.status)
          setAdminNotes(data.flag.admin_notes ?? '')
          setChangesDocumented(data.flag.changes_documented ?? '')
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
  }, [flagId])

  if (orgRole !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  if (!flagId) return <Navigate to="/flagged-calls" replace />

  const evaluation = flag?.call_evaluations

  const save = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const response = await apiFetch('/api/flagged-calls', {
        method: 'PATCH',
        body: JSON.stringify({
          flagId,
          status,
          adminNotes,
          changesDocumented,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Update failed')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/flagged-calls">
          <ArrowLeft className="size-4" />
          Back to flagged calls
        </Link>
      </Button>

      {loading ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : error && !flag ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : flag ? (
        <>
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {log?.name ?? flag.call_id ?? 'Flagged call'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Reviewing officer:{' '}
              {evaluation?.organization_members?.display_name ??
                evaluation?.organization_members?.email ??
                '—'}
            </p>
          </header>

          {log ? (
            <>
              {log.summary ? (
                <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{log.summary}</p>
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
            </>
          ) : null}

          {evaluation ? (
            <section className="space-y-4 rounded-2xl border p-5">
              <h2 className="text-lg font-semibold">Original evaluation</h2>
              <p className="text-sm font-medium">
                Average: {evaluation.average_rating?.toFixed(2) ?? '—'} / 5 · Priority:{' '}
                {evaluation.flag_priority ?? 'normal'}
              </p>
              <p className="text-sm text-muted-foreground">{evaluation.flag_reason}</p>
              <ol className="list-decimal space-y-2 ps-5 text-sm">
                {EVALUATION_QUESTIONS.map((q, i) => {
                  const key = `rating_q${i + 1}` as keyof EvaluationPayload
                  const val = evaluation[key] as number | undefined
                  const label = LIKERT_OPTIONS.find((o) => o.value === val)?.label
                  return (
                    <li key={q}>
                      {q}{' '}
                      <span className="text-muted-foreground">
                        — {label ?? '—'} ({val ?? '—'})
                      </span>
                    </li>
                  )
                })}
              </ol>
              {evaluation.suggestions ? (
                <p className="text-sm">
                  <span className="font-medium">Suggestions:</span> {evaluation.suggestions}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-4 rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Admin resolution</h2>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {saved ? (
              <Alert>
                <AlertDescription>Status updated and history recorded.</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="admin-status">Status</Label>
              <select
                id="admin-status"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ADMIN_FLAG_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-notes">Internal admin notes</Label>
              <textarea
                id="admin-notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="changes-doc">Changes implemented</Label>
              <textarea
                id="changes-doc"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={changesDocumented}
                onChange={(e) => setChangesDocumented(e.target.value)}
              />
            </div>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Save review
            </Button>
          </section>

          {history.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Status history</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {history.map((row) => (
                  <li key={row.created_at + row.to_status} className="rounded-lg border px-3 py-2">
                    <span className="font-medium text-foreground">
                      {row.from_status
                        ? `${ADMIN_FLAG_STATUS_LABELS[row.from_status] ?? row.from_status} → `
                        : ''}
                      {ADMIN_FLAG_STATUS_LABELS[row.to_status] ?? row.to_status}
                    </span>
                    {' · '}
                    {row.organization_members?.display_name ?? row.organization_members?.email ?? 'Admin'}{' '}
                    · {new Date(row.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}