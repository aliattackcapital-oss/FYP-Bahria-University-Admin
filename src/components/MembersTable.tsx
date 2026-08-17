import type { Member, MemberRole, MemberStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MembersTableProps {
  members: Member[]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function roleVariant(role: MemberRole) {
  if (role === 'Admin') return 'default' as const
  return 'outline' as const
}

function statusVariant(status: MemberStatus) {
  return status === 'Active' ? ('secondary' as const) : ('outline' as const)
}

export function MembersTable({ members }: MembersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-12 px-4">Name</TableHead>
            <TableHead className="h-12 px-4">Role</TableHead>
            <TableHead className="h-12 px-4">Department</TableHead>
            <TableHead className="h-12 px-4">Status</TableHead>
            <TableHead className="h-12 px-4">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-4">
                <Badge variant={roleVariant(member.role)}>{member.role}</Badge>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                {member.department}
              </TableCell>
              <TableCell className="px-4 py-4">
                <Badge variant={statusVariant(member.status)}>{member.status}</Badge>
              </TableCell>
              <TableCell className="px-4 py-4 text-muted-foreground">
                {formatDate(member.joinedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
