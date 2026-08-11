import { useEffect, useState } from 'react'
import { Moon } from 'lucide-react'
import { applyTheme, getStoredTheme, toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const theme = getStoredTheme()
    applyTheme(theme)
    setDark(theme === 'dark')
  }, [])

  const onToggle = () => {
    setDark(toggleTheme() === 'dark')
  }

  const switchControl = (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      onClick={onToggle}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
        dark ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform duration-200',
          dark ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )

  if (compact) return switchControl

  return (
    <div className="mb-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <Moon className="size-4 shrink-0" />
        Dark mode
      </div>
      {switchControl}
    </div>
  )
}
