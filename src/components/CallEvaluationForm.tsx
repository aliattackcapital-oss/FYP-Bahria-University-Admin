import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import {
  averageFromRatings,
  EVALUATION_QUESTIONS,
  LIKERT_OPTIONS,
  type LikertRating,
} from '@/lib/evaluationQuestions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type CallEvaluationFormProps = {
  callId: string
  onSuccess?: () => void
  showHeading?: boolean
}

type LoadedEvaluation = {
  rating_q1?: number | null
  rating_q2?: number | null
  rating_q3?: number | null
  rating_q4?: number | null
  rating_q5?: number | null
  suggestions?: string | null
  flag_for_admin?: boolean
  flag_priority?: string | null
  flag_reason?: string | null
}

const RATING_FIELDS = [
  'rating_q1',
  'rating_q2',
  'rating_q3',
  'rating_q4',
  'rating_q5',
] as const

export function CallEvaluationForm({
  callId,
  onSuccess,
  showHeading = true,
}: CallEvaluationFormProps) {
  const [ratings, setRatings] = useState<Record<number, LikertRating | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  })
  const [suggestions, setSuggestions] = useState('')
  const [flagForAdmin, setFlagForAdmin] = useState(false)
  const [flagPriority, setFlagPriority] = useState<'normal' | 'urgent'>('normal')
  const [flagReason, setFlagReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const average = useMemo(() => averageFromRatings(ratings), [ratings])
  const allAnswered = [1, 2, 3, 4, 5].every((i) => ratings[i] != null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await apiFetch(
          `/api/call-evaluations?callId=${encodeURIComponent(callId)}`,
        )
        const data = (await response.json()) as {
          evaluation?: LoadedEvaluation
          schemaReady?: boolean
        }
        if (!response.ok || cancelled) return
        const row = data.evaluation
        if (!row) return
        const next: Record<number, LikertRating | null> = { 1: null, 2: null, 3: null, 4: null, 5: null }
        for (let i = 1; i <= 5; i += 1) {
          const v = row[RATING_FIELDS[i - 1]!]
          if (v != null && v >= 1 && v <= 5) next[i] = v as LikertRating
        }
        setRatings(next)
        setSuggestions(row.suggestions ?? '')
        setFlagForAdmin(Boolean(row.flag_for_admin))
        setFlagPriority(row.flag_priority === 'urgent' ? 'urgent' : 'normal')
        setFlagReason(row.flag_reason ?? '')
      } catch {
        // no saved evaluation yet
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [callId])

  const submit = async () => {
    if (!allAnswered) {
      setError('Please answer all five questions before submitting.')
      return
    }
    if (flagForAdmin && !flagReason.trim()) {
      setError('Enter a reason when flagging for admin review.')
      return
    }
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const body = {
        callId,
        ratingQ1: ratings[1],
        ratingQ2: ratings[2],
        ratingQ3: ratings[3],
        ratingQ4: ratings[4],
        ratingQ5: ratings[5],
        suggestions,
        flagForAdminReview: flagForAdmin,
        flagPriority: flagForAdmin ? flagPriority : undefined,
        flagReason: flagForAdmin ? flagReason.trim() : undefined,
      }
      const response = await apiFetch('/api/call-evaluations', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not save evaluation')
      setDone(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading evaluation…</p>
  }

  if (done) {
    return (
      <Alert>
        <CheckCircle2 className="size-4" />
        <AlertDescription>Evaluation saved successfully.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm">
      {showHeading ? (
        <div>
          <h2 className="text-lg font-semibold">Human call evaluation</h2>
          <p className="text-sm text-muted-foreground">
            Rate this call, add optional suggestions, and flag for super admin review if needed.
          </p>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {average != null ? (
        <p className="text-sm font-medium">
          Average rating:{' '}
          <span className="tabular-nums text-primary">{average.toFixed(2)}</span> / 5
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Average updates when all five questions are answered.</p>
      )}

      <fieldset className="space-y-6">
        {EVALUATION_QUESTIONS.map((question, index) => {
          const q = index + 1
          return (
            <div key={q} className="space-y-2">
              <legend className="text-sm font-medium leading-snug">
                {q}. {question} <span className="text-destructive">*</span>
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {LIKERT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors',
                      ratings[q] === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-transparent hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="radio"
                      name={`eval-q${q}`}
                      className="size-3.5 accent-primary"
                      checked={ratings[q] === opt.value}
                      onChange={() =>
                        setRatings((prev) => ({ ...prev, [q]: opt.value as LikertRating }))
                      }
                    />
                    <span>{opt.label}</span>
                    <span className="text-muted-foreground">({opt.value})</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`suggestions-${callId}`}>Suggestions / recommendations (optional)</Label>
        <textarea
          id={`suggestions-${callId}`}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Ideas to improve responses, missing info, or follow-up notes…"
          value={suggestions}
          onChange={(e) => setSuggestions(e.target.value)}
        />
      </div>

      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label id={`flag-label-${callId}`} htmlFor={`flag-switch-${callId}`} className="font-medium">
            Flag for Admin Review
          </Label>
          <Switch
            id={`flag-switch-${callId}`}
            aria-labelledby={`flag-label-${callId}`}
            checked={flagForAdmin}
            disabled={busy}
            onCheckedChange={setFlagForAdmin}
          />
        </div>

        {flagForAdmin ? (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-1">
              <Label htmlFor={`flag-priority-${callId}`}>Priority</Label>
              <select
                id={`flag-priority-${callId}`}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={flagPriority}
                onChange={(e) => setFlagPriority(e.target.value as 'normal' | 'urgent')}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`flag-reason-${callId}`}>
                Reason for flagging <span className="text-destructive">*</span>
              </Label>
              <textarea
                id={`flag-reason-${callId}`}
                rows={2}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <Button type="button" className="w-full sm:w-auto" disabled={busy || !allAnswered} onClick={() => void submit()}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Submit evaluation
      </Button>
    </div>
  )
}