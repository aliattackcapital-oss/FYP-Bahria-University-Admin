import { useState } from 'react'
import type { Creator } from '@/types'

interface CreatorCardProps {
  creator: Creator
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const [failed, setFailed] = useState(false)
  const src = `/creators/${creator.photo}`

  return (
    <article className="group flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/50">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {!failed ? (
          <img
            src={src}
            alt={creator.name}
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-b from-muted to-background">
            <div className="flex size-16 items-center justify-center rounded-full border border-primary/40 bg-background text-xl font-semibold tracking-tight text-primary">
              {initials(creator.name)}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative -mt-8 min-h-14 space-y-0.5 px-3 pb-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {creator.name}
        </h2>
        <p className="font-mono text-xs text-primary">
          {creator.enrollment ?? '\u00a0'}
        </p>
      </div>
    </article>
  )
}
