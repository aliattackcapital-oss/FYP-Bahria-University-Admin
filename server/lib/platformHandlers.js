import { createInviteLink } from './authInvite.js'
import { deliverInvite } from './notificationDelivery.js'
import {
  createOrganizationWithVoice,
  deleteOrganizationById,
  findMemberByEmailGlobal,
  logActivity,
  slugFromOrganizationName,
  toClientMember,
} from './organization.js'
import { bootstrapPlatformOperator, countPlatformOperators, listOrganizationsForPlatform } from './platform.js'
import { provisionRetellForOrganization } from './retellProvision.js'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.js'
import { getPlatformUsageStats } from './platformStats.js'
import { normalizeHttpUrl } from './urls.js'

function bootstrapSecretOk(req) {
  const expected = process.env.VOCA_PLATFORM_BOOTSTRAP_SECRET?.trim()
  if (!expected) return false
  const provided = String(req.body?.secret ?? req.headers?.['x-platform-bootstrap-secret'] ?? '').trim()
  return provided && provided === expected
}

export async function handleBootstrapPlatformOperator(req, res) {
  if (!bootstrapSecretOk(req)) {
    return res.status(403).json({ error: 'Invalid bootstrap secret.' })
  }
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database is not configured.' })
  }
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'email is required' })
  try {
    const operator = await bootstrapPlatformOperator({
      email,
      displayName: req.body?.displayName || 'Platform Admin',
    })
    const { link: copyLinkOnce } = await createInviteLink(email)
    return res.status(201).json({
      operator,
      copyLinkOnce,
      message:
        'Platform admin created. Open copyLinkOnce once to set password. Then use /platform after sign-in.',
    })
  } catch (error) {
    const status = error.message?.includes('already exists') ? 409 : 500
    return res.status(status).json({ error: error.message || 'Bootstrap failed' })
  }
}

export async function handleListPlatformOrganizations(_req, res) {
  try {
    const rows = await listOrganizationsForPlatform()
    return res.json({ organizations: rows })
  } catch (error) {
    console.error('list platform organizations failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to list organizations' })
  }
}

export async function handlePlatformUsageStats(req, res) {
  try {
    const url = new URL(req.url, 'http://local')
    const organizationId = url.searchParams.get('organizationId')?.trim() || null
    const usage = await getPlatformUsageStats(organizationId)
    return res.json({ usage })
  } catch (error) {
    console.error('platform usage stats failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to load platform usage' })
  }
}

export async function handleCreatePlatformOrganization(req, res) {
  const name = String(req.body?.organizationName ?? req.body?.name ?? '').trim()
  const superAdminEmail = String(req.body?.superAdminEmail ?? req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const websiteUrl = normalizeHttpUrl(
    req.body?.websiteUrl ?? req.body?.website ?? req.body?.organizationWebsite,
  )

  if (!name) return res.status(400).json({ error: 'organizationName is required' })
  if (!superAdminEmail) return res.status(400).json({ error: 'superAdminEmail is required' })
  if (!websiteUrl) {
    return res.status(400).json({ error: 'websiteUrl is required (valid https URL).' })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(503).json({ error: 'Database is not configured.' })

  const existingGlobal = await findMemberByEmailGlobal(superAdminEmail)
  if (existingGlobal) {
    return res.status(409).json({ error: 'That email already belongs to an organization.' })
  }

  let slug = slugFromOrganizationName(name)
  let voice
  try {
    voice = await provisionRetellForOrganization({ organizationName: name, websiteUrl })
  } catch (error) {
    console.error('retell provision failed:', error)
    return res.status(502).json({
      error: error.message || 'Failed to provision voice agent.',
    })
  }

  let organization
  try {
    organization = await createOrganizationWithVoice({
      name,
      slug,
      websiteUrl,
      retellAgentId: voice.agentId,
      retellKnowledgeBaseId: voice.knowledgeBaseId,
      retellLlmId: voice.llmId,
    })
  } catch (error) {
    if (error.message?.includes('slug')) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`
      try {
        organization = await createOrganizationWithVoice({
          name,
          slug,
          websiteUrl,
          retellAgentId: voice.agentId,
          retellKnowledgeBaseId: voice.knowledgeBaseId,
          retellLlmId: voice.llmId,
        })
      } catch (retryErr) {
        return res.status(409).json({ error: retryErr.message || 'Could not create organization.' })
      }
    } else {
      return res.status(500).json({ error: error.message || 'Could not create organization.' })
    }
  }

  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organization.id,
      email: superAdminEmail,
      display_name: superAdminEmail,
      role: 'super_admin',
      status: 'invited',
    })
    .select()
    .single()
  if (memberError) {
    await deleteOrganizationById(organization.id)
    return res.status(500).json({ error: memberError.message || 'Failed to create super admin member.' })
  }

  let copyLinkOnce
  try {
    const { link } = await createInviteLink(superAdminEmail)
    copyLinkOnce = link
    await deliverInvite({
      email: superAdminEmail,
      inviteLink: link,
      organizationName: organization.name,
      inviterName: 'VOCA Platform',
      role: 'super_admin',
    })
  } catch (inviteErr) {
    console.error('super admin invite failed:', inviteErr)
    return res.status(500).json({
      error: 'Organization created but invite link failed. Use recovery from platform.',
      organization,
    })
  }

  await logActivity({
    organizationId: organization.id,
    actorMemberId: null,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organization.id,
    metadata: {
      superAdminEmail,
      createdByPlatform: true,
    },
  })

  return res.status(201).json({
    organization,
    member: toClientMember(member),
    copyLinkOnce,
    message:
      'Organization created. Share copyLinkOnce with the super admin so they can set a password.',
  })
}

export async function handleDeletePlatformOrganization(req, res) {
  const organizationId = String(req.body?.organizationId ?? req.query?.organizationId ?? '').trim()
  if (!organizationId) return res.status(400).json({ error: 'organizationId is required' })

  try {
    const operators = await countPlatformOperators()
    if (operators < 1) {
      return res.status(503).json({ error: 'Platform operators are not configured.' })
    }
    await deleteOrganizationById(organizationId)
    return res.json({ ok: true })
  } catch (error) {
    console.error('delete organization failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to delete organization' })
  }
}