import { Inbox } from 'lucide-react'
import type { CallLog } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CallLogsTableProps {
  logs: CallLog[]
  onRowClick: (log: CallLog) => void
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function CallLogsTable({ logs, onRowClick }: CallLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-20 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No call logs yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Completed conversations will show up here with caller details,
          recordings, and transcripts.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-12 px-4">Name</TableHead>
            <TableHead className="h-12 px-4">Phone</TableHead>
            <TableHead className="h-12 px-4">Email</TableHead>
            <TableHead className="h-12 px-4">Enrollment</TableHead>
            <TableHead className="h-12 px-4">Intent</TableHead>
            <TableHead className="h-12 px-4">Date / Time</TableHead>
            <TableHead className="h-12 px-4">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              className="cursor-pointer"
              onClick={() => onRowClick(log)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRowClick(log)
                }
              }}
              tabIndex={0}
              role="button"
            >
              <TableCell className="px-4 py-4 font-medium">{log.name}</TableCell>
              <TableCell className="px-4 py-4">{log.phone}</TableCell>
              <TableCell className="px-4 py-4">{log.email}</TableCell>
              <TableCell className="px-4 py-4">{log.enrollment}</TableCell>
              <TableCell className="px-4 py-4">
                <Badge variant="outline">{log.intent || '—'}</Badge>
              </TableCell>
              <TableCell className="px-4 py-4">
                {formatDateTime(log.timestamp)}
              </TableCell>
              <TableCell className="px-4 py-4 tabular-nums">
                {formatDuration(log.durationSeconds)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
