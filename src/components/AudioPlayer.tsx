import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioPlayerProps {
  src: string | null
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const hasSource = Boolean(src)

  useEffect(() => {
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio || !hasSource) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="metadata"
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          onClick={toggle}
          disabled={!hasSource}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={current}
            disabled={!hasSource}
            onChange={(e) => {
              const value = Number(e.target.value)
              setCurrent(value)
              if (audioRef.current) audioRef.current.currentTime = value
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-foreground disabled:cursor-not-allowed"
          />
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{formatTime(current)}</span>
            <span>{hasSource ? formatTime(duration) : '—:—'}</span>
          </div>
        </div>
      </div>

      {!hasSource && (
        <p className="mt-3 text-xs text-muted-foreground">
          Recording unavailable — audio will appear here once calls are saved.
        </p>
      )}
    </div>
  )
}
