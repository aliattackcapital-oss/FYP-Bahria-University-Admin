import { isSupabaseConfigured } from './supabase.js'
import {
  getCallLogById,
  getDashboardStats,
  listCallLogs,
  mapCallToLog,
  persistCallLog,
  syncCallFromRemote,
  waitAndSyncCall,
} from './callSync.js'
import {
  addKnowledgeSources,
  fetchKnowledgeBase,
  parseKnowledgeFiles,
} from './knowledgeBase.js'
import { activateInvitedMember, resolveSessionProfile } from './auth.js'
import { resolveVoiceIds } from './orgVoice.js'
import { createInviteLink, createRecoveryLink } from './authInvite.js'
import { deliverInvite } from './notificationDelivery.js'
import {
  adminFlagsSchemaReady,
  getFlaggedCallDetail,
  listFlaggedCalls,
  updateAdminFlagReview,
} from './evaluationFlags.js'
import {
  evaluationsSchemaReady,
  getEvaluationForCall,
  listEvaluations,
  upsertEvaluation,
} from './evaluations.js'
import {
  listInvitations,
  revokeInvitation,
  upsertPendingInvitation,
} from './invitations.js'
import { getManagementStats } from './managementStats.js'
import { forbidUnlessRole, PERMS } from './rbac.js'
import {
  assertMemberCanEvaluate,
  backfillReviewTasks,
  claimReviewTask,
  listReviewTasks,
  markReviewInProgress,
  reassignReviewTask,
  reviewQueueSchemaReady,
} from './reviewQueue.js'
import { agentPromptConfigured, getAgentPromptDetails, publishAgentGeneralPrompt } from './agentPrompt.js'
import { activityLogsSchemaReady, listActivityLogs } from './activityLogs.js'
import { getFrontDeskActivityStats } from './frontDeskActivityStats.js'
import {
  bootstrapSuperAdmin,
  findMemberByEmailGlobal,
  getOrganizationBySlug,
  listOrganizationMembers,
  logActivity,
  toClientMember,
  updateOrganizationMember,
} from './organization.js'
import { previewSitemapUrls } from './sitemap.js'
import { getSupabaseAdmin } from './supabase.js'

function apiKey() {
  return process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
}

export async function handleCreateWebCall(req, res) {
  const key = apiKey()
  const organization = req.auth.organization
  const { agentId: agent } = resolveVoiceIds(organization)
  if (!key || !agent) {
    return res.status(500).json({
      error: 'Voice agent is not configured for this organization.',
    })
  }

  try {
    const response = await fetch('https://api.retellai.com/v3/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agent }),
    })

    if (!response.ok) {
      const details = await response.text()
      return res.status(response.status).json({
        error: 'Failed to create web call',
        details,
      })
    }

    const call = await response.json()

    if (isSupabaseConfigured() && call.call_id) {
      try {
        await persistCallLog({
          id: call.call_id,
          organization_id: organization.id,
          name: 'Web caller',
          phone: '—',
          email: '—',
          enrollment: '—',
          intent: '—',
          duration_seconds: 0,
          started_at: new Date().toISOString(),
          summary: null,
          audio_url: null,
          transcript: [],
          call_status: 'ongoing',
          analyzed: false,
          raw_payload: { call_id: call.call_id, call_type: 'web_call', agent_id: agent },
        })
      } catch (error) {
        console.warn('Pending call log insert failed:', error)
      }
    }

    return res.json({
      accessToken: call.access_token,
      callId: call.call_id,
      transport: call.transport,
      iceServers: call.ice_servers,
    })
  } catch (error) {
    console.error('create-web-call error:', error)
    return res.status(500).json({ error: 'Unexpected error creating web call' })
  }
}

export async function handleDashboardStats(req, res) {
  const organizationId = req.auth?.organization?.id ?? null
  if (!isSupabaseConfigured()) {
    return res.status(200).json({
      configured: false,
      stats: await getDashboardStats(organizationId),
    })
  }
  try {
    const stats = await getDashboardStats(organizationId)
    return res.json({ stats, configured: true })
  } catch (error) {
    console.error('dashboard stats failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load dashboard stats' })
  }
}

export async function handleListCallLogs(req, res) {
  const organizationId = req.auth?.organization?.id ?? null
  if (!isSupabaseConfigured()) {
    return res.status(200).json({ logs: [], configured: false })
  }
  try {
    const logs = await listCallLogs(organizationId)
    return res.json({ logs, configured: true })
  } catch (error) {
    console.error('list call logs failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load call logs' })
  }
}

export async function handleRefreshCallLogs(_req, res) {
  const key = apiKey()
  if (!key) return res.status(500).json({ error: 'Missing RETELL_API_KEY.' })
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Supabase is not configured.' })
  }

  try {
    const organizationId = req.auth?.organization?.id ?? null
    const existing = await listCallLogs(organizationId)
    const logs = []
    for (const item of existing) {
      try {
        logs.push(await syncCallFromRemote(item.id, key))
      } catch (error) {
        console.warn('Refresh skipped for', item.id, error)
        logs.push(item)
      }
    }
    return res.json({ logs })
  } catch (error) {
    console.error('refresh call logs failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to refresh call logs' })
  }
}

export async function handleSyncCall(req, res) {
  const key = apiKey()
  if (!key) return res.status(500).json({ error: 'Missing RETELL_API_KEY.' })
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Supabase is not configured.' })
  }

  const callId = req.body?.callId || req.query?.callId
  if (!callId) return res.status(400).json({ error: 'callId is required' })

  try {
    const wait = req.body?.wait !== false
    const log = wait
      ? await waitAndSyncCall(callId, key)
      : await syncCallFromRemote(callId, key)
    return res.json({ log })
  } catch (error) {
    console.error('sync call failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to sync call' })
  }
}

export async function handleWebhook(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      accepts: ['call_analyzed', 'call_ended'],
      supabase: isSupabaseConfigured(),
    })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const event = body?.event
  const call = body?.call

  if (!event || !call?.call_id) {
    return res.status(400).json({ error: 'Expected { event, call }' })
  }

  if (!/^call_[a-zA-Z0-9]+$/.test(String(call.call_id))) {
    return res.status(400).json({ error: 'Expected a Retell call id' })
  }

  console.log('Webhook received:', event, call.call_id)

  if (!isSupabaseConfigured()) {
    console.warn('Webhook received but Supabase is not configured')
    return res.status(204).end()
  }

  try {
    // call_analyzed is the source of truth for name, email, summary, transcript.
    // call_ended is stored too so a recording/duration still appears if analysis is delayed.
    if (event === 'call_analyzed' || event === 'call_ended') {
      await persistCallLog(mapCallToLog(call))
    }
    return res.status(204).end()
  } catch (error) {
    console.error('webhook persist failed:', error)
    return res.status(500).json({ error: 'Failed to store call' })
  }
}

export async function handleGetAgentPrompt(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.AGENT_PROMPT)) return
  const organization = req.auth.organization
  if (!agentPromptConfigured(organization)) {
    return res.json({ configured: false, prompt: null })
  }
  try {
    const details = await getAgentPromptDetails(organization)
    return res.json({ configured: true, ...details })
  } catch (error) {
    console.error('get agent prompt failed:', error)
    return res.status(500).json({
      configured: false,
      error: error.message || 'Failed to load agent prompt',
    })
  }
}

export async function handlePublishAgentPrompt(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.AGENT_PROMPT)) return
  const generalPrompt = req.body?.generalPrompt
  const beginMessage = req.body?.beginMessage
  const organization = req.auth.organization
  if (!agentPromptConfigured(organization)) {
    return res.status(503).json({ error: 'Voice agent is not configured.' })
  }
  try {
    const details = await publishAgentGeneralPrompt(organization, generalPrompt, beginMessage)
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'agent.prompt_published',
      entityType: 'retell_agent',
      entityId: details.agentId,
      metadata: { llmVersion: details.llmVersion, agentVersion: details.agentVersion },
    })
    return res.json({ configured: true, ...details })
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 500 ? error.status : 500
    console.error('publish agent prompt failed:', error)
    return res.status(status).json({ error: error.message || 'Failed to publish prompt' })
  }
}

export async function handleGetKnowledgeBase(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.KB_READ)) return
  try {
    const kb = await fetchKnowledgeBase(req.auth.organization)
    return res.json({
      configured: true,
      name: kb.knowledge_base_name,
      status: kb.status,
      sources: kb.knowledge_base_sources ?? [],
    })
  } catch (error) {
    console.error('get knowledge base failed:', error)
    return res.status(500).json({
      configured: false,
      error: error.message || 'Failed to load knowledge base',
    })
  }
}

export function handleAddKnowledgeSources(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.KB_WRITE)) return undefined
  parseKnowledgeFiles(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid upload' })
    }
    try {
      const urls = parseUrlField(req.body?.url ?? req.body?.urls)
      const kb = await addKnowledgeSources(req.auth.organization, { files: req.files, urls })
      return res.status(201).json({
        configured: true,
        name: kb.knowledge_base_name,
        status: kb.status,
        sources: kb.knowledge_base_sources ?? [],
      })
    } catch (error) {
      console.error('add knowledge sources failed:', error)
      const status = Number(error.status) >= 400 && Number(error.status) < 500 ? error.status : 500
      return res.status(status).json({
        error: error.message || 'Failed to add knowledge',
      })
    }
  })
}

export async function handlePreviewSitemap(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.KB_SITEMAP)) return
  const url = req.body?.url || req.query?.url
  if (!url) {
    return res.status(400).json({ error: 'Enter a website URL.' })
  }
  try {
    const result = await previewSitemapUrls(url)
    return res.json(result)
  } catch (error) {
    console.error('preview sitemap failed:', error)
    return res.status(400).json({
      error: error.message || 'Could not scan sitemap',
    })
  }
}

function parseUrlField(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // single URL string
  }
  return [String(raw)]
}

const ORG_ROLES = new Set(['super_admin', 'admin', 'front_desk'])

export async function handleGetOrganization(_req, res) {
  if (!isSupabaseConfigured()) {
    return res.status(200).json({ configured: false, organization: null })
  }
  try {
    const result = await getOrganizationBySlug()
    if (!result.schemaReady) {
      return res.status(200).json({
        configured: false,
        organization: null,
        schemaReady: false,
        hint: 'Apply supabase/migrations/20261115180000_organizations.sql',
      })
    }
    return res.json({
      configured: true,
      schemaReady: true,
      organization: result.organization,
    })
  } catch (error) {
    console.error('get organization failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load organization' })
  }
}

export async function handleListOrganizationMembers(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.MEMBERS_VIEW)) return
  if (!isSupabaseConfigured()) {
    return res.status(200).json({ configured: false, members: [] })
  }
  try {
    const organization = req.auth.organization
    const rows = await listOrganizationMembers(organization.id)
    return res.json({
      configured: true,
      organization: { id: organization.id, slug: organization.slug, name: organization.name },
      members: rows.map(toClientMember),
    })
  } catch (error) {
    console.error('list organization members failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load members' })
  }
}

export async function handleBootstrapOrganization(req, res) {
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Supabase is not configured.' })
  }
  try {
    const { organization, schemaReady } = await getOrganizationBySlug()
    if (!schemaReady || !organization) {
      return res.status(503).json({
        error: 'Organization schema is not applied.',
        hint: 'Run supabase/migrations/20261115180000_organizations.sql',
      })
    }

    const email =
      req.body?.email?.trim() ||
      process.env.VOCA_BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim()
    if (!email) {
      return res.status(400).json({
        error: 'Provide email in body or set VOCA_BOOTSTRAP_SUPER_ADMIN_EMAIL.',
      })
    }

    const member = await bootstrapSuperAdmin({
      email,
      displayName: req.body?.displayName || 'Super Admin',
      organizationId: organization.id,
    })

    const { link: copyLinkOnce } = await createInviteLink(email)

    return res.status(201).json({
      organization,
      member: toClientMember(member),
      copyLinkOnce,
      message:
        'Open copyLinkOnce once to set your password. Treat this link as a secret; it is not stored on the server.',
    })
  } catch (error) {
    console.error('bootstrap organization failed:', error?.message || error)
    const status = error.message?.includes('already exists') ? 409 : 500
    return res.status(status).json({ error: error.message || 'Bootstrap failed' })
  }
}

export async function handleInviteOrganizationMember(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.INVITATIONS)) return
  const auth = req.auth

  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Supabase is not configured.' })
  }
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const displayName = String(req.body?.displayName ?? req.body?.name ?? '').trim()
  const role = String(req.body?.role ?? 'front_desk').trim()

  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!ORG_ROLES.has(role) || role === 'super_admin') {
    return res.status(400).json({ error: 'role must be admin or front_desk' })
  }

  try {
    const organization = auth.organization
    const supabase = getSupabaseAdmin()

    const globalMember = await findMemberByEmailGlobal(email)
    if (globalMember && globalMember.organization_id !== organization.id) {
      return res.status(409).json({ error: 'That email already belongs to another organization.' })
    }

    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organization.id)
      .eq('email', email)
      .maybeSingle()

    if (existingMember?.status === 'active') {
      return res.status(409).json({ error: 'That email is already an active member.' })
    }

    let memberRow
    if (existingMember) {
      const { data, error } = await supabase
        .from('organization_members')
        .update({
          display_name: displayName || email,
          role,
          status: 'invited',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id)
        .select()
        .single()
      if (error) throw error
      memberRow = data
    } else {
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          email,
          display_name: displayName || email,
          role,
          status: 'invited',
        })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'That email is already a member.' })
        }
        throw error
      }
      memberRow = data
    }

    let invitationRecord = null
    try {
      invitationRecord = await upsertPendingInvitation({
        organizationId: organization.id,
        email,
        role,
        invitedByMemberId: auth.member.id,
      })
    } catch (inviteTableError) {
      console.warn('organization_invitations update skipped:', inviteTableError?.message)
    }

    const { link } = await createInviteLink(email)
    const delivery = await deliverInvite({
      email,
      inviteLink: link,
      organizationName: organization.name,
      inviterName: auth.member.display_name || auth.member.email,
      role,
    })

    await logActivity({
      organizationId: organization.id,
      actorMemberId: auth.member.id,
      action: 'member.invited',
      entityType: 'organization_member',
      entityId: memberRow.id,
      metadata: { email, role, invitationId: invitationRecord?.id ?? null },
    })

    return res.status(201).json({
      member: toClientMember(memberRow),
      invitationId: invitationRecord?.id ?? null,
      copyLinkOnce: delivery.copyLinkOnce,
      emailSent: delivery.emailSent,
      deliveryMode: delivery.mode,
    })
  } catch (error) {
    console.error('invite organization member failed:', error?.message || error)
    return res.status(500).json({ error: error.message || 'Failed to invite member' })
  }
}

export async function handleListOrganizationInvitations(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.INVITATIONS)) return
  try {
  const organization = req.auth.organization
    const rows = await listInvitations(organization.id)
    return res.json({ invitations: rows })
  } catch (error) {
    console.error('list invitations failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to list invitations' })
  }
}

export async function handleRevokeOrganizationInvitation(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.INVITATIONS)) return
  const invitationId = String(req.body?.invitationId ?? '').trim()
  if (!invitationId) return res.status(400).json({ error: 'invitationId is required' })
  try {
    const organization = req.auth.organization
    const row = await revokeInvitation({ organizationId: organization.id, invitationId })
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'invitation.revoked',
      entityType: 'organization_invitation',
      entityId: invitationId,
      metadata: { email: row.email },
    })
    return res.json({ invitation: row })
  } catch (error) {
    console.error('revoke invitation failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to revoke invitation' })
  }
}

export async function handleMemberRecoveryLink(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.INVITATIONS)) return
  const memberId = String(req.body?.memberId ?? '').trim()
  if (!memberId) return res.status(400).json({ error: 'memberId is required' })
  try {
    const organization = req.auth.organization
    const supabase = getSupabaseAdmin()
    const { data: member, error } = await supabase
      .from('organization_members')
      .select('id, email, status, role')
      .eq('organization_id', organization.id)
      .eq('id', memberId)
      .maybeSingle()
    if (error) throw error
    if (!member) return res.status(404).json({ error: 'Member not found.' })
    if (member.status !== 'active') {
      return res.status(400).json({ error: 'Recovery links are for active members only.' })
    }

    const { link } = await createRecoveryLink(member.email)
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'member.recovery_link',
      entityType: 'organization_member',
      entityId: memberId,
      metadata: { email: member.email },
    })

    return res.json({
      copyLinkOnce: link,
      message: 'Deliver this recovery link through a secure channel.',
    })
  } catch (error) {
    console.error('recovery link failed:', error?.message || error)
    return res.status(500).json({ error: error.message || 'Failed to create recovery link' })
  }
}

export async function handleUpdateOrganizationMember(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.MEMBERS_MANAGE)) return
  const auth = req.auth

  const memberId = String(req.body?.memberId ?? '').trim()
  const role = req.body?.role ? String(req.body.role).trim() : undefined
  const status = req.body?.status ? String(req.body.status).trim() : undefined

  if (!memberId) return res.status(400).json({ error: 'memberId is required' })
  if (!role && !status) return res.status(400).json({ error: 'role or status is required' })
  if (role && (role === 'super_admin' || !ORG_ROLES.has(role))) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  if (status && !['active', 'invited', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const row = await updateOrganizationMember({
      organizationId: auth.organization.id,
      memberId,
      role,
      status,
      actorMemberId: auth.member.id,
    })
    return res.json({ member: toClientMember(row) })
  } catch (error) {
    console.error('update organization member failed:', error)
    const statusCode = error.message?.includes('last active super admin') ? 409 : 500
    return res.status(statusCode).json({ error: error.message || 'Failed to update member' })
  }
}

export async function handleManagementStats(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.MANAGEMENT_STATS)) return
  try {
    const organization = req.auth.organization
    const stats = await getManagementStats(organization.id)
    return res.json({ stats })
  } catch (error) {
    console.error('management stats failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load management stats' })
  }
}

export async function handleGetCallLogDetail(req, res) {
  const callId = String(req.query?.callId ?? '').trim()
  if (!callId) return res.status(400).json({ error: 'callId is required' })
  const forReview = req.query?.forReview === '1'
  if (forReview) {
    if (!forbidUnlessRole(req, res, PERMS.CALL_DETAIL_REVIEW)) return
  } else if (!forbidUnlessRole(req, res, PERMS.CALL_DETAIL)) return
  try {
    const organization = req.auth.organization
    const log = await getCallLogById(callId, organization?.id ?? null)
    if (!log) return res.status(404).json({ error: 'Call not found.' })
    if (forReview) {
      const gate = await assertMemberCanEvaluate({
        organizationId: organization.id,
        callId,
        memberId: req.auth.member.id,
      })
      if (!gate.ok) return res.status(403).json({ error: gate.error })
    }
    return res.json({ log })
  } catch (error) {
    console.error('get call detail failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load call' })
  }
}

export async function handleGetCallEvaluation(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.EVALUATION_GET)) return
  const callId = String(req.query?.callId ?? '').trim()
  if (!callId) return res.status(400).json({ error: 'callId is required' })
  if (!isSupabaseConfigured()) {
    return res.json({ configured: false, evaluation: null })
  }
  try {
    const ready = await evaluationsSchemaReady()
    if (!ready) {
      return res.json({
        configured: false,
        schemaReady: false,
        hint: 'Apply supabase/migrations/20261115210000_evaluation_likert_flags.sql',
      })
    }
    const organization = req.auth.organization
    const row = await getEvaluationForCall(organization.id, callId)
    return res.json({ configured: true, evaluation: row })
  } catch (error) {
    console.error('get call evaluation failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load evaluation' })
  }
}

export async function handleUpsertCallEvaluation(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.EVALUATIONS_WRITE)) return
  const callId = String(req.body?.callId ?? '').trim()
  if (!callId) return res.status(400).json({ error: 'callId is required' })
  try {
    const ready = await evaluationsSchemaReady()
    if (!ready) {
      return res.status(503).json({
        error: 'Evaluation schema is not applied.',
        hint: 'Apply supabase/migrations/20261115210000_evaluation_likert_flags.sql',
      })
    }
    const organization = req.auth.organization
    const gate = await assertMemberCanEvaluate({
      organizationId: organization.id,
      callId,
      memberId: req.auth.member.id,
    })
    if (!gate.ok) return res.status(403).json({ error: gate.error })

    const row = await upsertEvaluation({
      organizationId: organization.id,
      callId,
      reviewerMemberId: req.auth.member.id,
      payload: req.body,
    })
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'call.evaluated',
      entityType: 'call_log',
      entityId: callId,
      metadata: {
        averageRating: row.average_rating,
        flagForAdmin: row.flag_for_admin,
      },
    })
    try {
      const { completeReviewTask } = await import('./reviewQueue.js')
      await completeReviewTask({ organizationId: organization.id, callId })
    } catch {
      // queue optional until migration applied
    }
    return res.json({ evaluation: row })
  } catch (error) {
    const message = error?.message || 'Failed to save evaluation'
    const status = message.includes('required') || message.includes('must be') ? 400 : 500
    console.error('upsert call evaluation failed:', error)
    return res.status(status).json({ error: message })
  }
}

export async function handleListFlaggedCalls(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.FLAGGED_CALLS)) return
  try {
    const flagsReady = await adminFlagsSchemaReady()
    if (!flagsReady) {
      return res.json({
        configured: false,
        hint: 'Apply supabase/migrations/20261115210000_evaluation_likert_flags.sql',
        flags: [],
      })
    }
    const organization = req.auth.organization
    const flags = await listFlaggedCalls(organization.id)
    return res.json({ configured: true, flags })
  } catch (error) {
    console.error('list flagged calls failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load flagged calls' })
  }
}

export async function handleGetFlaggedCall(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.FLAGGED_CALLS)) return
  const flagId = String(req.query?.flagId ?? '').trim()
  if (!flagId) return res.status(400).json({ error: 'flagId is required' })
  try {
    const organization = req.auth.organization
    const detail = await getFlaggedCallDetail(organization.id, flagId)
    if (!detail) return res.status(404).json({ error: 'Flag not found' })

    const callId = detail.flag.call_id
    let log = null
    try {
      log = await getCallLogById(callId)
    } catch {
      log = null
    }

    return res.json({
      flag: detail.flag,
      history: detail.history,
      log: log ? mapCallToLog(log) : null,
    })
  } catch (error) {
    console.error('get flagged call failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load flag' })
  }
}

export async function handleUpdateFlaggedCall(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.FLAGGED_CALLS)) return
  const flagId = String(req.body?.flagId ?? '').trim()
  const status = String(req.body?.status ?? '').trim()
  const adminNotes = req.body?.adminNotes
  const changesDocumented = req.body?.changesDocumented
  if (!flagId) return res.status(400).json({ error: 'flagId is required' })
  if (!status) return res.status(400).json({ error: 'status is required' })
  try {
    const organization = req.auth.organization
    const row = await updateAdminFlagReview({
      organizationId: organization.id,
      flagId,
      adminMemberId: req.auth.member.id,
      status,
      adminNotes,
      changesDocumented,
    })
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'evaluation_flag.updated',
      entityType: 'call_evaluation_admin_flag',
      entityId: flagId,
      metadata: { status },
    })
    return res.json({ flag: row })
  } catch (error) {
    const message = error?.message || 'Failed to update flag'
    const code = message.includes('Invalid') || message.includes('not found') ? 400 : 500
    console.error('update flagged call failed:', error)
    return res.status(code).json({ error: message })
  }
}

export async function handleFrontDeskActivityStats(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.ACTIVITY_LOGS)) return
  try {
    const organization = req.auth.organization
    const stats = await getFrontDeskActivityStats(organization.id)
    return res.json({ stats })
  } catch (error) {
    console.error('front desk activity stats failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load stats' })
  }
}

export async function handleListActivityLogs(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.ACTIVITY_LOGS)) return
  const scope = String(req.query?.scope ?? 'front_desk').trim()
  try {
    const ready = await activityLogsSchemaReady()
    if (!ready) {
      return res.json({ configured: false, logs: [] })
    }
    const organization = req.auth.organization
    const frontDeskOnly = scope === 'front_desk'
    const logs = await listActivityLogs(organization.id, { frontDeskOnly })
    return res.json({ configured: true, logs })
  } catch (error) {
    console.error('list activity logs failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load activity' })
  }
}

export async function handleListCallEvaluations(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.EVALUATIONS_READ)) return
  try {
    const ready = await evaluationsSchemaReady()
    if (!ready) {
      return res.json({ configured: false, evaluations: [] })
    }
    const organization = req.auth.organization
    const rows = await listEvaluations(organization.id)
    return res.json({ configured: true, evaluations: rows })
  } catch (error) {
    console.error('list call evaluations failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to list evaluations' })
  }
}

export async function handleListReviewQueue(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.REVIEW_QUEUE)) return
  const filter = String(req.query?.filter ?? 'unassigned').trim()
  try {
    const ready = await reviewQueueSchemaReady()
    if (!ready) {
      return res.json({
        configured: false,
        schemaReady: false,
        hint: 'Apply supabase/migrations/20261115193000_call_review_tasks.sql',
        tasks: [],
      })
    }
    const organization = req.auth.organization
    const memberId = req.auth.member.id
    const tasks = await listReviewTasks(organization.id, { filter, memberId })
    return res.json({ configured: true, tasks })
  } catch (error) {
    console.error('list review queue failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load review queue' })
  }
}

export async function handleClaimReviewTask(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.REVIEW_QUEUE)) return
  const callId = String(req.body?.callId ?? '').trim()
  if (!callId) return res.status(400).json({ error: 'callId is required' })
  try {
    const ready = await reviewQueueSchemaReady()
    if (!ready) {
      return res.status(503).json({ error: 'Review queue schema is not applied.' })
    }
    const organization = req.auth.organization
    const result = await claimReviewTask({
      organizationId: organization.id,
      callId,
      memberId: req.auth.member.id,
    })
    if (!result.ok) return res.status(409).json({ error: result.error })
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'review.claimed',
      entityType: 'call_log',
      entityId: callId,
    })
    return res.json({ task: result.task })
  } catch (error) {
    console.error('claim review task failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to claim review' })
  }
}

export async function handleStartReviewTask(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.REVIEW_QUEUE)) return
  const callId = String(req.body?.callId ?? '').trim()
  if (!callId) return res.status(400).json({ error: 'callId is required' })
  try {
    const organization = req.auth.organization
    const task = await markReviewInProgress({
      organizationId: organization.id,
      callId,
      memberId: req.auth.member.id,
    })
    if (!task) return res.status(403).json({ error: 'You have not claimed this call.' })
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'review.started',
      entityType: 'call_log',
      entityId: callId,
    })
    return res.json({ task })
  } catch (error) {
    console.error('start review failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to start review' })
  }
}

export async function handleReassignReviewTask(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.REVIEW_QUEUE_ASSIGN)) return
  const callId = String(req.body?.callId ?? '').trim()
  const memberId = String(req.body?.memberId ?? '').trim()
  if (!callId || !memberId) {
    return res.status(400).json({ error: 'callId and memberId are required' })
  }
  try {
    const organization = req.auth.organization
    const task = await reassignReviewTask({
      organizationId: organization.id,
      callId,
      memberId,
    })
    if (!task) return res.status(404).json({ error: 'Task not found or not reassignable.' })
    await logActivity({
      organizationId: organization.id,
      actorMemberId: req.auth.member.id,
      action: 'review.reassigned',
      entityType: 'call_log',
      entityId: callId,
      metadata: { memberId },
    })
    return res.json({ task })
  } catch (error) {
    console.error('reassign review failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to reassign' })
  }
}

export async function handleBackfillReviewQueue(req, res) {
  if (!forbidUnlessRole(req, res, PERMS.REVIEW_BACKFILL)) return
  try {
    const ready = await reviewQueueSchemaReady()
    if (!ready) {
      return res.status(503).json({ error: 'Review queue schema is not applied.' })
    }
    const organization = req.auth.organization
    const result = await backfillReviewTasks(organization.id)
    return res.json(result)
  } catch (error) {
    console.error('backfill review queue failed:', error)
    return res.status(500).json({ error: error.message || 'Backfill failed' })
  }
}

export async function handleAuthActivate(req, res) {
  try {
    const result = await activateInvitedMember(req)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    if (result.isPlatform) {
      return res.json({
        isPlatform: true,
        platformOperator: {
          email: result.platformOperator.email,
          displayName: result.platformOperator.display_name || result.platformOperator.email,
        },
      })
    }
    return res.json({
      isPlatform: false,
      member: toClientMember(result.member),
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    })
  } catch (error) {
    console.error('auth activate failed:', error)
    return res.status(500).json({ error: error.message || 'Activation failed' })
  }
}

export async function handleAuthMe(req, res) {
  try {
    const result = await resolveSessionProfile(req)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    if (result.kind === 'platform') {
      return res.json({
        isPlatform: true,
        user: { id: result.user.id, email: result.user.email },
        platformOperator: {
          email: result.platformOperator.email,
          displayName: result.platformOperator.display_name || result.platformOperator.email,
        },
      })
    }
    return res.json({
      isPlatform: false,
      user: { id: result.user.id, email: result.user.email },
      member: toClientMember(result.member),
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    })
  } catch (error) {
    console.error('auth me failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load profile' })
  }
}
