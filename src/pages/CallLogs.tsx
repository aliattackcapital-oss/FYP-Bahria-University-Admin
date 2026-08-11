import { useEffect, useState } from 'react'
import { CallDetailsDrawer } from '@/components/CallDetailsDrawer'
import { CallLogsTable } from '@/components/CallLogsTable'
import type { CallLog } from '@/types'

export function CallLogs() {
  const [logs, setLogs] = useState<CallLog[]>([])
  const [selected, setSelected] = useState<CallLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/call-logs')
      const data = (await response.json()) as {
        logs?: CallLog[]
        configured?: boolean
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load call logs')
      setLogs(data.logs ?? [])
      setConfigured(data.configured !== false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load call logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
    const onUpdated = () => void loadLogs()
    window.addEventListener('call-logs-updated', onUpdated)
    const id = window.setInterval(() => void loadLogs(), 15000)
    return () => {
      window.removeEventListener('call-logs-updated', onUpdated)
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-sm text-muted-foreground">
          Completed conversations with recordings, summaries, and transcripts.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading call logs…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !configured && (
        <p className="text-sm text-muted-foreground">
          Connect Supabase to store and display live call reports.
        </p>
      )}
      {!loading && <CallLogsTable logs={logs} onRowClick={setSelected} />}

      <CallDetailsDrawer
        call={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
