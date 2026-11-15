import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginArt } from '@/components/LoginArt'
import { VocaLogo } from '@/components/VocaLogo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const { loading, isActive, error, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isActive) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setBusy(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not sign in')
      setBusy(false)
    }
  }

  const message = localError || error

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <VocaLogo />

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use the email and password from your invitation. New staff must use the invite link
              from a super admin first.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            {message ? (
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Sign in
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Opening an invitation link?{' '}
              <Link to="/accept-invite" className="text-primary underline-offset-4 hover:underline">
                Complete invite
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden border-s border-border lg:block">
        <LoginArt />
      </div>
    </div>
  )
}