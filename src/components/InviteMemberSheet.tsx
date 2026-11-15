import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteMemberSheetProps {
  open: boolean
  onClose: () => void
  onInvite: (member: {
    name: string
    email: string
    role: 'admin' | 'front_desk'
  }) => string | void | Promise<string | void>
}

export function InviteMemberSheet({
  open,
  onClose,
  onInvite,
}: InviteMemberSheetProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'front_desk'>('front_desk')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setEmail('')
    setRole('front_desk')
    setError('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
      onClose()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    void Promise.resolve(
      onInvite({ name: name.trim(), email: email.trim(), role }),
    )
      .then((problem) => {
        if (problem) {
          setError(problem)
          return
        }
        handleOpenChange(false)
      })
      .finally(() => setSaving(false))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            After you submit, copy the invitation link once and send it securely. They must use this exact email to accept and set a password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              name="name"
              autoComplete="name"
              placeholder="Ayesha Khan"
              value={name}
              onChange={(e) => {
                setError('')
                setName(e.target.value)
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@bahria.edu.pk"
              value={email}
              onChange={(e) => {
                setError('')
                setEmail(e.target.value)
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'front_desk')}
            >
              <option value="front_desk">Front desk</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}