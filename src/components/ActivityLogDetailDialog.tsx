import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { describeActivityAction } from '@/lib/activityLabels'
import type { ActivityLogEntry, CallLog } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ActivityLogDetailDialogProps = {
  entry: ActivityLogEntry | null
  open: boolean
  onClose: () => void
}

function formatWhenLong(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function actionTitle(_action: string) {
  return 'Call evaluation'
}

export function ActivityLogDetailDialog({
  entry,
  open,
  onClose,
}: ActivityLogDetailDialogProps) {
  const [call, setCall] = useState<CallLog | null>(null)
  const [callLoading, setCallLoading] = useState(false)

  useEffect(() => {
    if (!open || !entry?.entityId || entry.entityType !== 'call_log') {
      setCall(null)
      return
    }
    let cancelled = false
    const load = async () => {
      setCallLoading(true)
      try {
        const response = await apiFetch(
          `/api/call-logs/detail?callId=${encodeURIComponent(entry.entityId!)}`,
        )
        const data = (await response.json()) as { log?: CallLog }
        if (!cancelled && response.ok) setCall(data.log ?? null)
      } catch {
        if (!cancelled) setCall(null)
      } finally {
        if (!cancelled) setCallLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, entry?.entityId, entry?.entityType])

  if (!entry) return null

  const flagged = Boolean(entry.metadata?.flagForAdmin)
  const avg = entry.metadata?.averageRating

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4 text-start">
          <DialogTitle>{actionTitle(entry.action)}</DialogTitle>
          <DialogDescription>{formatWhenLong(entry.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Officer
            </p>
            <p className="font-medium">{entry.actor?.name ?? 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{entry.actor?.email}</p>
          </div>

          <div>
            <p className="text-sm text-foreground">
              {describeActivityAction(entry.action, entry.metadata)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.action === 'call.evaluated' && avg != null ? (
                <Badge variant="secondary">Average {String(avg)}/5</Badge>
              ) : null}
              {flagged ? <Badge variant="destructive">Flagged for admin</Badge> : null}
            </div>
          </div>

          {entry.entityId ? (
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Call</p>
              {callLoading ? (
                <Loader2 className="mt-2 size-5 animate-spin text-muted-foreground" />
              ) : call ? (
                <div className="mt-1 space-y-1 text-sm">
                  <p className="font-medium">{call.name}</p>
                  <p className="text-muted-foreground">
                    {call.intent || '—'} · {call.phone}
                  </p>
                  {call.summary ? (
                    <p className="text-muted-foreground leading-relaxed">{call.summary}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 font-mono text-xs text-muted-foreground">{entry.entityId}</p>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}