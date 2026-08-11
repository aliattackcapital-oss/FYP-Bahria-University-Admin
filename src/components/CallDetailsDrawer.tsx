import type { CallLog } from '@/types'
import { AudioPlayer } from '@/components/AudioPlayer'
import { TranscriptView } from '@/components/TranscriptView'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface CallDetailsDrawerProps {
  call: CallLog | null
  open: boolean
  onClose: () => void
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function CallDetailsDrawer({ call, open, onClose }: CallDetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-start">
          <SheetTitle>{call?.name ?? 'Call details'}</SheetTitle>
          <SheetDescription>
            Caller info, recording, and transcript for this conversation.
          </SheetDescription>
        </SheetHeader>

        {call && (
          <div className="flex flex-1 flex-col gap-6 px-4 pb-6">
            <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <InfoRow label="Phone" value={call.phone} />
              <InfoRow label="Email" value={call.email} />
              <InfoRow label="Enrollment" value={call.enrollment} />
              <InfoRow label="Date & time" value={formatDateTime(call.timestamp)} />
              <InfoRow label="Duration" value={formatDuration(call.durationSeconds)} />
            </section>

            {call.summary && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Summary</h3>
                <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                  {call.summary}
                </p>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Recording</h3>
              <AudioPlayer src={call.audioUrl} />
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Transcript</h3>
              <TranscriptView lines={call.transcript} />
            </section>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  )
}
