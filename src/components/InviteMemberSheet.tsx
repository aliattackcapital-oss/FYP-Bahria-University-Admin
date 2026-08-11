import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface InviteMemberSheetProps {
  open: boolean
  onClose: () => void
}

export function InviteMemberSheet({ open, onClose }: InviteMemberSheetProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const reset = () => {
    setName('')
    setEmail('')
    setSent(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
      onClose()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="text-start">
          <SheetTitle>Add a member</SheetTitle>
          <SheetDescription>
            Send an invitation with the person’s name and email. They will
            receive a link to join the organization.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col"
        >
          <div className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                name="name"
                autoComplete="name"
                placeholder="Ayesha Khan"
                value={name}
                onChange={(e) => {
                  setSent(false)
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
                  setSent(false)
                  setEmail(e.target.value)
                }}
                required
              />
            </div>
            {sent && (
              <p className="text-sm text-muted-foreground">
                Invitation preview ready for {name} ({email}). Sending will be
                wired up later.
              </p>
            )}
          </div>

          <SheetFooter>
            <Button type="submit">Send invitation</Button>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
