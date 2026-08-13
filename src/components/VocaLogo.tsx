import { cn } from '@/lib/utils'

export function VocaLogo({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'font-[Outfit,ui-sans-serif,system-ui,sans-serif] text-[1.7rem] font-extrabold tracking-[0.22em] text-foreground',
        className,
      )}
    >
      VOCA
    </p>
  )
}
