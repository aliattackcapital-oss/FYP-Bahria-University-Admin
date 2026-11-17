import { useEffect, useState } from 'react'
import { Tags } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { CallLog } from '@/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const INTENTS = ['Admissions', 'Fees & finance', 'Academics & timetable'] as const

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
        const response = await apiFetch('/api/call-logs')
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

  const total = INTENTS.reduce((sum, name) => sum + counts[name], 0)

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Call intent</CardTitle>
        <Tags className="size-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="text-2xl font-bold tabular-nums">{total}</div>
        <p className="text-xs text-muted-foreground">Analyzed conversations · all time</p>
        <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
          {INTENTS.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
            >
              <span>{name}</span>
              <span className="tabular-nums font-medium text-foreground">{counts[name]}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}