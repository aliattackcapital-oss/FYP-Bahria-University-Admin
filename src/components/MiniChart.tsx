import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'

interface MiniChartProps {
  data: number[]
  labels?: string[]
  valueFormatter?: (value: number) => string
}

export function MiniChart({
  data,
  labels,
  valueFormatter = (v) => String(v),
}: MiniChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const chartData = data.map((value, index) => ({
    value,
    label: labels?.[index] ?? `D${index + 1}`,
  }))
  const hasActivity = chartData.some((point) => point.value > 0)

  return (
    <div className="h-14 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as { label: string; value: number }
              return (
                <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
                  <span className="text-muted-foreground">{point.label}: </span>
                  <span className="font-medium">{valueFormatter(point.value)}</span>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            className="text-primary"
            dot={hasActivity && chartData.length <= 1 ? { r: 3, fill: 'currentColor' } : false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}