import { sendMemberInviteEmail } from './email.js'

/**
 * Invite delivery abstraction — default copy-only (no SMTP).
 */
export async function deliverInvite({
  email,
  inviteLink,
  organizationName,
  inviterName,
  role,
}) {
  const mode = (process.env.VOCA_INVITE_DELIVERY || 'copy_only').trim().toLowerCase()

  if (mode === 'copy_only') {
    return { mode: 'copy_only', copyLinkOnce: inviteLink, emailSent: false }
  }

  if (mode === 'resend' && process.env.RESEND_API_KEY?.trim()) {
    const result = await sendMemberInviteEmail({
      to: email,
      organizationName,
      inviterName,
      role,
      inviteUrl: inviteLink,
    })
    return { mode: 'resend', copyLinkOnce: inviteLink, emailSent: result.sent }
  }

  return { mode: 'copy_only', copyLinkOnce: inviteLink, emailSent: false }
}