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
  icon: LucideIcon
  data: number[]
  labels?: string[]
  valueFormatter?: (value: number) => string
}

export function StatCard({
  title,
  value,
  subtitle = 'Last 7 days',
  icon: Icon,
  data,
  labels,
  valueFormatter,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <div className="mt-4 text-primary">
          <MiniChart data={data} labels={labels} valueFormatter={valueFormatter} />
        </div>
      </CardContent>
    </Card>
  )
}
