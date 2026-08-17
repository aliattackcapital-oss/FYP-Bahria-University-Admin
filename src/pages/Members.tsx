import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { InviteMemberSheet } from '@/components/InviteMemberSheet'
import { MembersTable } from '@/components/MembersTable'
import { Button } from '@/components/ui/button'
import { members as seedMembers } from '@/lib/members'
import type { Member } from '@/types'

export function Members() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>(seedMembers)

  const handleInvite = ({ name, email }: { name: string; email: string }) => {
    const exists = members.some(
      (member) => member.email.toLowerCase() === email.toLowerCase(),
    )
    if (exists) return 'That email is already on the members list.'

    setMembers((current) => [
      {
        id: `mem-${Date.now()}`,
        name,
        email,
        role: 'Front Desk',
        department: 'Organization',
        status: 'Invited',
        joinedAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus />
          Add a member
        </Button>
      </div>

      <MembersTable members={members} />

      <InviteMemberSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  )
}
