import { ClipboardCheck, Flag, Star, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FrontDeskActivityStats } from '@/types'
import { cn } from '@/lib/utils'

type ActivityKpiStripProps = {
  stats: FrontDeskActivityStats
  className?: string
}

export function ActivityKpiStrip({ stats, className }: ActivityKpiStripProps) {
  const avgPerOfficer =
    stats.activeOfficers > 0
      ? (stats.evaluationsThisWeek / stats.activeOfficers).toFixed(1)
      : '0'

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-4 sm:gap-3 sm:p-4',
        className,
      )}
    >
      <ScoreCard
        title="Active officers"
        value={String(stats.activeOfficers)}
        hint="Front desk"
        icon={UserCheck}
      />
      <ScoreCard
        title="Evaluations"
        value={String(stats.evaluationsThisWeek)}
        hint="Last 7 days"
        icon={ClipboardCheck}
      />
      <ScoreCard
        title="Avg per officer"
        value={avgPerOfficer}
        hint="Evaluations / officer"
        icon={Star}
      />
      <ScoreCard
        title="Open flags"
        value={String(stats.openFlags)}
        hint={`${stats.flagsRaisedThisWeek} flagged this week`}
        icon={Flag}
        href="/flagged-calls"
      />
    </div>
  )
}

function ScoreCard({
  title,
  value,
  hint,
  icon: Icon,
  href,
}: {
  title: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
}) {
  const cardClass =
    'flex min-h-[6.75rem] flex-col gap-1.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-3 sm:min-h-[7rem] sm:px-4 sm:py-3.5'

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold leading-none tracking-tight sm:text-2xl">{value}</p>
      <p className="mt-auto text-[11px] leading-normal text-muted-foreground">{hint}</p>
    </>
  )

  if (href) {
    return (
      <Link to={href} className={cn(cardClass, 'transition-opacity hover:opacity-90')}>
        {body}
      </Link>
    )
  }

  return <div className={cardClass}>{body}</div>
}