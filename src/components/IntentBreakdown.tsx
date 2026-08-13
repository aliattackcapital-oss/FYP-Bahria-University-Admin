import { useEffect, useState } from 'react'
import { PieChart as PieIcon } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CallLog } from '@/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const INTENTS = [
  { name: 'Admissions', fill: 'var(--foreground)' },
  { name: 'Fees & finance', fill: 'color-mix(in oklab, var(--foreground) 55%, var(--background))' },
  { name: 'Academics & timetable', fill: 'color-mix(in oklab, var(--foreground) 22%, var(--background))' },
] as const

export function IntentBreakdown() {
  const [counts, setCounts] = useState({
    Admissions: 0,
    'Fees & finance': 0,
    'Academics & timetable': 0,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/call-logs')
        const data = (await response.json()) as { logs?: CallLog[] }
        if (!response.ok || cancelled) return
        const next = {
          Admissions: 0,
          'Fees & finance': 0,
          'Academics & timetable': 0,
        }
        for (const log of data.logs ?? []) {
          if (log.intent in next) next[log.intent as keyof typeof next] += 1
        }
        setCounts(next)
      } catch {
        // keep zeros
      }
    }

    void load()
    const onUpdated = () => void load()
    window.addEventListener('call-logs-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('call-logs-updated', onUpdated)
    }
  }, [])

  const chartData = INTENTS.map((item) => ({
    name: item.name,
    value: counts[item.name],
    fill: item.fill,
  }))
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Call intent</CardTitle>
        <PieIcon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total}</div>
        <p className="text-xs text-muted-foreground">Analyzed conversations</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-14 w-14 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? chartData : [{ name: 'None', value: 1, fill: 'var(--border)' }]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={14}
                  outerRadius={26}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {(total > 0 ? chartData : [{ fill: 'var(--border)' }]).map((slice) => (
                    <Cell key={slice.fill} fill={slice.fill} />
                  ))}
                </Pie>
                {total > 0 && (
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const point = payload[0].payload as { name: string; value: number }
                      return (
                        <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
                          <span className="text-muted-foreground">{point.name}: </span>
                          <span className="font-medium">{point.value}</span>
                        </div>
                      )
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-0 flex-1 space-y-1">
            {INTENTS.map((item) => (
              <li key={item.name} className="flex items-center gap-2 text-[11px] leading-none">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: item.fill }}
                />
                <span className="min-w-0 truncate text-muted-foreground">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
