import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { InviteMemberSheet } from '@/components/InviteMemberSheet'
import { MembersTable } from '@/components/MembersTable'
import { Button } from '@/components/ui/button'
import { members } from '@/lib/members'

export function Members() {
  const [inviteOpen, setInviteOpen] = useState(false)

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
      />
    </div>
  )
}
