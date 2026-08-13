import { Clock3, Phone, Radio } from 'lucide-react'
import { MiniChart } from '@/components/MiniChart'
import { dashboardStats } from '@/lib/mockData'

const services = [
  {
    label: 'CALLS',
    name: 'ai-receptionist',
    icon: Phone,
    value: dashboardStats.totalCalls.toLocaleString(),
    data: dashboardStats.callsTrend,
  },
  {
    label: 'AVG MINUTES',
    name: 'conversation-length',
    icon: Clock3,
    value: dashboardStats.averageMinutesPerCall.toFixed(1),
    data: dashboardStats.avgMinutesTrend,
  },
  {
    label: 'MINUTES USED',
    name: 'weekly-volume',
    icon: Radio,
    value: dashboardStats.totalMinutesConsumed.toLocaleString(),
    data: dashboardStats.totalMinutesTrend,
  },
]

export function LoginArt() {
  return (
    <aside className="relative hidden min-h-svh overflow-hidden bg-background lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_42%,transparent_78%)]"
      />

      <div className="relative z-10 flex h-full flex-col justify-between gap-10 px-10 py-12 xl:px-14">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground">
              PRODUCTION
            </p>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-foreground xl:text-4xl">
              A 24/7 AI receptionist, in one console.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Review live conversations, call volume, and recordings without
              leaving the portal.
            </p>
          </div>

          <div className="inline-flex items-center rounded-md border border-foreground/15 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 shadow-sm dark:bg-zinc-950">
            <span className="me-2 text-emerald-400">$</span>
            24/7 ai receptionist
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
              LIVE SERVICES
            </p>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Available
            </p>
          </div>

          <div className="grid gap-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <service.icon className="size-3.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                        {service.label}
                      </p>
                      <p className="truncate text-sm font-medium">{service.name}</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {service.value}
                  </p>
                </div>
                <div className="text-primary">
                  <MiniChart data={service.data} labels={dashboardStats.labels} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
