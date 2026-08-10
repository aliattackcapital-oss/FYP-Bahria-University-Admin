import { useState } from 'react'
import { CallDetailsDrawer } from '@/components/CallDetailsDrawer'
import { CallLogsTable } from '@/components/CallLogsTable'
import { callLogs } from '@/lib/callLogs'
import type { CallLog } from '@/types'

export function CallLogs() {
  const [selected, setSelected] = useState<CallLog | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-sm text-muted-foreground">
          Browse past conversations, recordings, and transcripts.
        </p>
      </div>

      <CallLogsTable logs={callLogs} onRowClick={setSelected} />

      <CallDetailsDrawer
        call={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
