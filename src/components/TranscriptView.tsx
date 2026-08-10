import type { TranscriptLine } from '@/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface TranscriptViewProps {
  lines: TranscriptLine[]
}

function formatStamp(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function TranscriptView({ lines }: TranscriptViewProps) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No transcript available yet.</p>
      </div>
    )
  }

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border bg-muted/30 p-4">
      {lines.map((line, index) => {
        const isSarah = line.speaker === 'Sarah'
        return (
          <div
            key={`${line.timestampSeconds}-${index}`}
            className={cn('flex', isSarah ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'max-w-[90%] rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-xs',
                isSarah
                  ? 'rounded-tl-md bg-background'
                  : 'rounded-tr-md bg-primary text-primary-foreground'
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <Badge
                  className={cn(
                    'h-5 border-transparent px-1.5 text-[10px]',
                    isSarah
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary-foreground/20 text-primary-foreground'
                  )}
                >
                  {line.speaker}
                </Badge>
                <span
                  className={cn(
                    'text-[11px]',
                    isSarah ? 'text-muted-foreground' : 'text-primary-foreground/70'
                  )}
                >
                  {formatStamp(line.timestampSeconds)}
                </span>
              </div>
              <p>{line.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
