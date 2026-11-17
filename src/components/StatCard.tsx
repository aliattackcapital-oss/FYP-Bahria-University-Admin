import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MiniChart } from '@/components/MiniChart'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  chartCaption?: string
  icon: LucideIcon
  data: number[]
  labels?: string[]
  valueFormatter?: (value: number) => string
  showChart?: boolean
}

export function StatCard({
  title,
  value,
  subtitle = 'All time',
  chartCaption = 'Last 7 days',
  icon: Icon,
  data,
  labels,
  valueFormatter,
  showChart = true,
}: StatCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {showChart ? (
          <div className="mt-4 min-w-0 space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {chartCaption}
            </p>
            <div className="text-primary">
              <MiniChart data={data} labels={labels} valueFormatter={valueFormatter} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}