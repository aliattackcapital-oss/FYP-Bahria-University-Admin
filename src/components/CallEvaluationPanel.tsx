import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { CallEvaluation, EvaluationVerdict } from '@/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const VERDICT_OPTIONS: { value: EvaluationVerdict; label: string }[] = [
  { value: 'correct', label: 'Correct' },
  { value: 'partially_correct', label: 'Partially correct' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'unable_to_assess', label: 'Unable to assess' },
]

type CallEvaluationPanelProps = {
  callId: string
}

export function CallEvaluationPanel({ callId }: CallEvaluationPanelProps) {
  const [verdict, setVerdict] = useState<EvaluationVerdict>('correct')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [schemaReady, setSchemaReady] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiFetch(`/api/call-evaluations?callId=${encodeURIComponent(callId)}`)
        const data = (await response.json()) as {
          evaluation?: CallEvaluation | null
          schemaReady?: boolean
          hint?: string
          error?: string
        }
        if (!response.ok) throw new Error(data.error || 'Failed to load evaluation')
        if (cancelled) return
        if (data.schemaReady === false) {
          setSchemaReady(false)
          return
        }
        if (data.evaluation) {
          setVerdict(data.evaluation.verdict)
          setNotes(data.evaluation.notes ?? '')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load evaluation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [callId])

  const handleSave = async () => {
    setBusy(true)
    setError(null)
  setSaved(false)
    try {
      const response = await apiFetch('/api/call-evaluations', {
        method: 'POST',
        body: JSON.stringify({ callId, verdict, notes }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading evaluation…</p>
  }

  if (!schemaReady) {
    return (
      <Alert>
        <AlertDescription>
          Run migration `20261115190000_phase2_5_extensions.sql` in Supabase to enable call
          evaluations.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Human evaluation</h3>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {saved ? (
        <p className="text-xs text-muted-foreground">Evaluation saved.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {VERDICT_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={verdict === opt.value ? 'default' : 'outline'}
            onClick={() => setVerdict(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eval-notes">Notes (optional)</Label>
        <textarea
          id="eval-notes"
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={notes}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Issues, follow-up, or KB suggestions…"
        />
      </div>
      <Button type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Save evaluation
      </Button>
    </section>
  )
}