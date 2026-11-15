import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type CopySecretDialogProps = {
  open: boolean
  title: string
  description: string
  secret: string | null
  onClose: () => void
}

export function CopySecretDialog({
  open,
  title,
  description,
  secret,
  onClose,
}: CopySecretDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // user can manual copy from readonly field if we add one
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {secret ? (
          <div className="break-all rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            {secret}
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button type="button" disabled={!secret} onClick={() => void handleCopy()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}