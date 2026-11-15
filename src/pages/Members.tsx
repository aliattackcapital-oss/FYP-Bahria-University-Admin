import { useCallback, useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CopySecretDialog } from '@/components/CopySecretDialog'
import { InviteMemberSheet } from '@/components/InviteMemberSheet'
import { MembersTable } from '@/components/MembersTable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import type { Member } from '@/types'

export function Members() {
  const { isSuperAdmin, orgRole } = useAuth()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [secretDialog, setSecretDialog] = useState<{
    title: string
    description: string
    secret: string
  } | null>(null)

  const canView =
    orgRole === 'super_admin' || orgRole === 'admin' || orgRole === 'front_desk'
  const readOnly = orgRole === 'front_desk'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/organization/members')
      const data = (await response.json()) as {
        configured?: boolean
        members?: Member[]
        organization?: { name: string }
        error?: string
      }
      if (response.status === 403) throw new Error('You cannot view the members directory.')
      if (!response.ok) throw new Error(data.error || 'Failed to load members')
      setMembers(data.members ?? [])
      setOrgName(data.organization?.name ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canView) void load()
  }, [canView, load])

  if (!canView) {
    return <Navigate to="/" replace />
  }

  const handleInvite = async ({
    name,
    email,
    role,
  }: {
    name: string
    email: string
    role: 'admin' | 'front_desk'
  }): Promise<string | void> => {
    const response = await apiFetch('/api/organization/members', {
      method: 'POST',
      body: JSON.stringify({
        displayName: name,
        email,
        role,
      }),
    })
    const data = (await response.json()) as {
      error?: string
      copyLinkOnce?: string
    }
    if (!response.ok) return data.error || 'Could not invite member'
    if (data.copyLinkOnce) {
      setSecretDialog({
        title: 'Copy invitation link',
        description:
          'This link is shown once. Send it through a secure channel. The invitee sets a password, then signs in with this email.',
        secret: data.copyLinkOnce,
      })
    }
    void load()
  }

  const handleRecoveryLink = async (memberId: string) => {
    setError(null)
    const response = await apiFetch('/api/organization/members/recovery-link', {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    })
    const data = (await response.json()) as { error?: string; copyLinkOnce?: string }
    if (!response.ok) {
      setError(data.error || 'Could not create recovery link')
      return
    }
    if (data.copyLinkOnce) {
      setSecretDialog({
        title: 'Copy password recovery link',
        description:
          'Verify the member’s identity out of band before sharing. Link is shown once.',
        secret: data.copyLinkOnce,
      })
    }
  }

  const handleUpdateMember = async (
    memberId: string,
    patch: { status?: 'active' | 'suspended'; role?: 'admin' | 'front_desk' },
  ) => {
    setError(null)
    const response = await apiFetch('/api/organization/members', {
      method: 'PATCH',
      body: JSON.stringify({ memberId, ...patch }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setError(data.error || 'Update failed')
      return
    }
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          {orgName ? <p className="text-sm text-muted-foreground">{orgName}</p> : null}
          {readOnly ? (
            <p className="text-sm text-muted-foreground">Read-only directory for your organization.</p>
          ) : null}
        </div>
        {isSuperAdmin ? (
          <Button onClick={() => setInviteOpen(true)} disabled={loading}>
            <UserPlus />
            Invite member
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isSuperAdmin && !readOnly ? (
        <p className="text-sm text-muted-foreground">
          Only super admins can invite, revoke, or issue recovery links.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : (
        <MembersTable
          members={members}
          canManage={isSuperAdmin && !readOnly}
          onSuspend={(id) => void handleUpdateMember(id, { status: 'suspended' })}
          onReactivate={(id) => void handleUpdateMember(id, { status: 'active' })}
          onRecoveryLink={isSuperAdmin ? (id) => void handleRecoveryLink(id) : undefined}
        />
      )}

      <InviteMemberSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />

      <CopySecretDialog
        open={secretDialog !== null}
        title={secretDialog?.title ?? ''}
        description={secretDialog?.description ?? ''}
        secret={secretDialog?.secret ?? null}
        onClose={() => setSecretDialog(null)}
      />
    </div>
  )
}