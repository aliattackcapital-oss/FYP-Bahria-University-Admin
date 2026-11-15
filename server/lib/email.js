function appBaseUrl() {
  const explicit = process.env.VOCA_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`
  return 'http://localhost:5173'
}

function inviteFromEmail() {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.VOCA_INVITE_FROM?.trim() ||
    'VOCA <onboarding@resend.dev>'
  )
}

export async function sendMemberInviteEmail({
  to,
  organizationName,
  inviterName,
  role,
  inviteUrl,
}) {
  const loginUrl = inviteUrl || `${appBaseUrl().replace(/\/$/, '')}/login`
  const resendKey = process.env.RESEND_API_KEY?.trim()

  const subject = `You're invited to ${organizationName} on VOCA`
  const html = `
    <p>Hi,</p>
    <p>${inviterName} invited you to join <strong>${organizationName}</strong> as <strong>${role.replace('_', ' ')}</strong>.</p>
    <p>Open this link once to set your password for <code>${to}</code>:</p>
    <p><a href="${loginUrl}">Accept invitation</a></p>
    <p>If the link expires, ask your super admin for a new invitation.</p>
  `

  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — invite email not sent to', to)
    return { sent: false, loginUrl }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: inviteFromEmail(),
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    console.error('Resend failed:', response.status, details)
    return { sent: false, loginUrl, error: details }
  }

  return { sent: true, loginUrl }
}