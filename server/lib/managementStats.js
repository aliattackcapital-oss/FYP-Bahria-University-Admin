import { listCallLogs } from './callSync.js'
import {
  countEvaluations,
  evaluationsSchemaReady,
  verdictBreakdown,
} from './evaluations.js'
import { listInvitations } from './invitations.js'
import { listOrganizationMembers } from './organization.js'

export async function getManagementStats(organizationId) {
  const [members, invitations, totalCalls] = await Promise.all([
    listOrganizationMembers(organizationId),
    listInvitations(organizationId).catch(() => []),
    listCallLogs(organizationId).then((logs) => logs.length),
  ])

  const activeMembers = members.filter((m) => m.status === 'active').length
  const invitedMembers = members.filter((m) => m.status === 'invited').length
  const suspendedMembers = members.filter((m) => m.status === 'suspended').length
  const pendingInvites =
    invitations.filter((i) => i.status === 'pending').length + invitedMembers

  const evalReady = await evaluationsSchemaReady()
  let evaluatedCalls = 0
  let verdicts = {}
  if (evalReady) {
    evaluatedCalls = await countEvaluations(organizationId)
    verdicts = await verdictBreakdown(organizationId)
  }

  const unevaluatedCalls = Math.max(0, totalCalls - evaluatedCalls)
  const evaluationRate =
    totalCalls > 0 ? Math.round((evaluatedCalls / totalCalls) * 1000) / 10 : 0

  return {
    activeMembers,
    invitedMembers,
    suspendedMembers,
    pendingInvites,
    totalCalls,
    evaluatedCalls,
    unevaluatedCalls,
    evaluationRate,
    verdicts,
    evaluationsEnabled: evalReady,
  }
}