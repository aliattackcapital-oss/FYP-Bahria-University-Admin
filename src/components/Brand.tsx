import { cn } from '@/lib/utils'

interface BrandProps {
  className?: string
  compact?: boolean
}

/** Small institutional mark used next to the portal name. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10.5 12 4l9 6.5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.5 9.75V18.5h13V9.75"
        />
        <path strokeLinecap="round" d="M9.5 18.5v-4.25h5V18.5" />
        <path strokeLinecap="round" d="M2.75 18.5h18.5" />
      </svg>
    </div>
  )
}

export function Brand({ className, compact = false }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            'font-semibold tracking-tight text-foreground',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          Bahria University
        </p>
        <p
          className={cn(
            'font-medium text-muted-foreground',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}
        >
          Front Desk Portal
        </p>
      </div>
    </div>
  )
}
