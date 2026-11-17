import { PlatformUsageOverview } from '@/components/PlatformUsageOverview'

export function PlatformDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Call usage and cost estimates across tenants.
        </p>
      </header>
      <PlatformUsageOverview />
    </div>
  )
}