import { useEffect, useState } from 'react'
import { Mic, PhoneOff } from 'lucide-react'
import {
  endCall,
  onCallError,
  onStatusChange,
  startCall,
  syncLastCall,
} from '@/lib/voiceAgent'
import type { CallStatus } from '@/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TalkToAliButton() {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => onStatusChange(setStatus), [])
  useEffect(() => onCallError(setError), [])

  useEffect(() => {
    if (status !== 'in_call') {
      if (status === 'idle') setElapsed(0)
      return
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const isLive = status === 'connecting' || status === 'in_call'

  const label =
    status === 'idle'
      ? 'Talk to Ali'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'in_call'
          ? `In Call · ${formatElapsed(elapsed)}`
          : 'Call Ended'

  const handleClick = () => {
    if (status === 'idle' || status === 'ended') {
      void startCall()
      return
    }
    void (async () => {
      await endCall()
      setSyncing(true)
      try {
        await syncLastCall()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save call report')
      } finally {
        setSyncing(false)
      }
    })()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Talk to Ali</CardTitle>
          <CardDescription>
            Start a live conversation with Ali about admissions, fees,
            classes, and other university questions.
          </CardDescription>
        </div>
        <Badge variant={isLive ? 'default' : 'secondary'}>
          {status === 'idle' && 'Ready'}
          {status === 'connecting' && 'Connecting'}
          {status === 'in_call' && 'Live'}
          {status === 'ended' && 'Ended'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative inline-flex">
          {(status === 'idle' || status === 'connecting' || status === 'in_call') && (
            <span className="pointer-events-none absolute inset-0 m-auto size-12 rounded-full bg-primary/20 animate-pulse-ring" />
          )}
          <Button
            size="lg"
            variant={isLive ? 'destructive' : 'default'}
            disabled={status === 'connecting'}
            onClick={handleClick}
            className="relative z-10 min-w-[200px] rounded-full"
          >
            {isLive ? <PhoneOff /> : <Mic />}
            {label}
          </Button>
        </div>
        {status === 'in_call' && (
          <p className="text-xs text-muted-foreground">Live · tap to end call</p>
        )}
        {syncing && (
          <p className="text-xs text-muted-foreground">
            Saving recording, summary, and transcript…
          </p>
        )}
        {status === 'connecting' && (
          <p className="text-xs text-muted-foreground">
            Allow microphone access if prompted…
          </p>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
