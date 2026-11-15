import { listFlaggedCalls } from './evaluationFlags.js'
import { listOrganizationMembers } from './organization.js'
import { listActivityLogs } from './activityLogs.js'

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10)
}

function lastSevenDayKeys() {
  const keys = []
  const labels = []
  const now = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    keys.push(dayKey(d))
    labels.push(
      new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d),
    )
  }
  return { keys, labels }
}

export async function getFrontDeskActivityStats(organizationId) {
  const [members, logs, flags] = await Promise.all([
    listOrganizationMembers(organizationId),
    listActivityLogs(organizationId, { limit: 400, frontDeskOnly: true }),
    listFlaggedCalls(organizationId).catch(() => []),
  ])

  const frontDesk = members.filter((m) => m.role === 'front_desk' && m.status === 'active')
  const memberName = (m) => m.display_name || m.email
  const { keys, labels } = lastSevenDayKeys()
  const evalByDay = Object.fromEntries(keys.map((k) => [k, 0]))
  const claimByDay = Object.fromEntries(keys.map((k) => [k, 0]))
  const byOfficer = new Map()

  for (const member of frontDesk) {
    byOfficer.set(member.id, {
      id: member.id,
      name: memberName(member),
      email: member.email,
      evaluations: 0,
      claims: 0,
    })
  }

  let evaluationsThisWeek = 0
  let claimsThisWeek = 0
  let flagsRaisedThisWeek = 0
  const weekStart = startOfDay(new Date())
  weekStart.setDate(weekStart.getDate() - 6)

  for (const entry of logs) {
    const at = new Date(entry.createdAt)
    if (at < weekStart) continue
    const key = dayKey(at)
    const officerId = entry.actor?.id
    const officer =
      officerId && byOfficer.has(officerId) ? byOfficer.get(officerId) : null

    if (entry.action === 'call.evaluated') {
      evaluationsThisWeek += 1
      if (key in evalByDay) evalByDay[key] += 1
      if (officer) officer.evaluations += 1
      if (entry.metadata?.flagForAdmin) flagsRaisedThisWeek += 1
    }
    if (entry.action === 'review.claimed') {
      claimsThisWeek += 1
      if (key in claimByDay) claimByDay[key] += 1
      if (officer) officer.claims += 1
    }
  }

  const openFlags = flags.filter((f) => f.status !== 'resolved').length
  const officerLeaderboard = [...byOfficer.values()]
    .sort((a, b) => b.evaluations - a.evaluations || b.claims - a.claims)
    .slice(0, 6)

  const maxOfficerEval = Math.max(1, ...officerLeaderboard.map((o) => o.evaluations))

  return {
    labels,
    activeOfficers: frontDesk.length,
    evaluationsThisWeek,
    claimsThisWeek,
    flagsRaisedThisWeek,
    openFlags,
    evaluationsTrend: keys.map((k) => evalByDay[k] ?? 0),
    claimsTrend: keys.map((k) => claimByDay[k] ?? 0),
    officerLeaderboard,
    maxOfficerEval,
  }
}