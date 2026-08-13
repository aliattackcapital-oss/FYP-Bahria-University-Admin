import { useEffect, useState } from 'react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import {
  endCall,
  isCallMuted,
  muteCall,
  onAgentTalking,
  onCallError,
  onStatusChange,
  startCall,
  syncLastCall,
  unmuteCall,
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
import { cn } from '@/lib/utils'

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function VoiceWave({ active, live }: { active: boolean; live: boolean }) {
  return (
    <div className="flex h-8 items-center gap-[3px]" aria-hidden>
      {[0.35, 0.7, 1, 0.55, 0.85, 0.45, 0.95].map((delay, i) => (
        <span
          key={i}
          className={cn(
            'w-[3px] rounded-full bg-primary',
            live ? 'voice-bar h-7' : 'h-2 opacity-40',
            live && active && 'voice-bar-live',
          )}
          style={live ? { animationDelay: `${delay}s` } : undefined}
        />
      ))}
    </div>
  )
}

export function TalkToAliButton() {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [talking, setTalking] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => onStatusChange(setStatus), [])
  useEffect(() => onCallError(setError), [])
  useEffect(() => onAgentTalking(setTalking), [])

  useEffect(() => {
    if (status !== 'in_call') {
      if (status === 'idle') {
        setElapsed(0)
        setMuted(false)
        setTalking(false)
      }
      return
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const isLive = status === 'connecting' || status === 'in_call'
  const showStage = isLive || status === 'ended'

  const handleStart = () => {
    if (status === 'idle' || status === 'ended') void startCall()
  }

  const handleEnd = () => {
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

  const handleMute = () => {
    if (muted) unmuteCall()
    else muteCall()
    setMuted(isCallMuted())
  }

  const stageLabel =
    status === 'connecting'
      ? 'Connecting…'
      : status === 'ended'
        ? syncing
          ? 'Saving report…'
          : 'Call ended'
        : talking
          ? 'Speaking'
          : muted
            ? 'Muted'
            : 'Listening'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Talk to Ali</CardTitle>
          <CardDescription>
            Start a live conversation with the 24/7 AI receptionist about
            admissions, fees, classes, and other university questions.
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
        {!showStage ? (
          <div className="relative inline-flex">
            <span className="pointer-events-none absolute inset-0 m-auto size-12 rounded-full bg-primary/20 animate-pulse-ring" />
            <Button
              size="lg"
              onClick={handleStart}
              className="relative z-10 min-w-[200px] rounded-full"
            >
              <Mic />
              Talk to Ali
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <VoiceWave active={talking} live={status === 'in_call'} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{stageLabel}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatElapsed(elapsed)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={muted ? 'default' : 'outline'}
                disabled={status !== 'in_call'}
                onClick={handleMute}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {muted ? <MicOff /> : <Mic />}
                {muted ? 'Unmute' : 'Mute'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={status === 'ended'}
                onClick={handleEnd}
                aria-label="End call"
              >
                <PhoneOff />
                End
              </Button>
            </div>
          </div>
        )}
        {status === 'connecting' && (
          <p className="text-xs text-muted-foreground">
            Allow microphone access if prompted…
          </p>
        )}
        {syncing && (
          <p className="text-xs text-muted-foreground">
            Saving recording, summary, and transcript…
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
