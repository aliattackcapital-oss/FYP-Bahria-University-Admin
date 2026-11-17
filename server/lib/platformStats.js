import { getDashboardStats } from './callSync.js'
import { listOrganizationsForPlatform } from './platform.js'
import { getSupabaseAdmin } from './supabase.js'

function isCompletedCall(row) {
  return (row.duration_seconds ?? 0) > 0 && row.call_status !== 'ongoing'
}

function costPerMinute() {
  const n = Number(process.env.VOCA_PLATFORM_COST_PER_MINUTE)
  return Number.isFinite(n) && n >= 0 ? n : 0.3
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100
}

export async function getPlatformUsageStats(organizationId = null) {
  const rate = costPerMinute()
  const filterId = organizationId?.trim() || null
  const orgs = await listOrganizationsForPlatform()
  if (filterId && !orgs.some((o) => o.id === filterId)) {
    throw new Error('Unknown organization.')
  }

  const overall = await getDashboardStats(filterId)
  const estimatedCostUsd = roundMoney(overall.totalMinutesConsumed * rate)
  const selectedOrganization = filterId ? orgs.find((o) => o.id === filterId) : null

  let byOrganization = []
  const supabase = getSupabaseAdmin()
  if (supabase) {
    const { data, error } = await supabase
      .from('call_logs')
      .select('organization_id, duration_seconds, call_status')
    if (error) throw error

    const rows = (data ?? []).filter(isCompletedCall)
    const buckets = new Map()
    for (const row of rows) {
      const id = row.organization_id
      if (!id) continue
      const bucket = buckets.get(id) ?? { calls: 0, seconds: 0 }
      bucket.calls += 1
      bucket.seconds += row.duration_seconds ?? 0
      buckets.set(id, bucket)
    }

    byOrganization = orgs
      .map((org) => {
        const bucket = buckets.get(org.id) ?? { calls: 0, seconds: 0 }
        const minutes = bucket.seconds / 60
        const totalMinutesConsumed = Math.round(minutes)
        return {
          organizationId: org.id,
          name: org.name,
          slug: org.slug,
          totalCalls: bucket.calls,
          averageMinutesPerCall: bucket.calls ? minutes / bucket.calls : 0,
          totalMinutesConsumed,
          estimatedCostUsd: roundMoney(totalMinutesConsumed * rate),
        }
      })
      .sort((a, b) => b.totalCalls - a.totalCalls)
  }

  return {
    costPerMinute: rate,
    selectedOrganizationId: filterId,
    selectedOrganization: selectedOrganization
      ? { organizationId: selectedOrganization.id, name: selectedOrganization.name, slug: selectedOrganization.slug }
      : null,
    organizations: orgs.map((o) => ({
      organizationId: o.id,
      name: o.name,
      slug: o.slug,
    })),
    overall: { ...overall, estimatedCostUsd },
    byOrganization,
  }
}