import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { completeAuthFromCurrentUrl } from '@/lib/authSessionFromUrl'
import { supabase } from '@/lib/supabaseClient'
import { LoginArt } from '@/components/LoginArt'
import { VocaLogo } from '@/components/VocaLogo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AcceptInvite() {
  const { loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase auth is not configured.')
      setSessionReady(true)
      return
    }

    let cancelled = false

    const client = supabase

    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await completeAuthFromCurrentUrl(client)
        if (cancelled) return
        if (sessionError) {
          setError(sessionError.message)
          setSessionReady(true)
          return
        }
        if (data.session) {
          setHasSession(true)
          setError(null)
          setSessionReady(true)
          return
        }
        setError(
          'Invite session not found. Open the invitation link again, or ask your super admin for a new one.',
        )
        setSessionReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not verify invitation')
          setSessionReady(true)
        }
      }
    }

    void checkSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (
        session &&
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')
      ) {
        setHasSession(true)
        setError(null)
        setSessionReady(true)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (loading || !sessionReady) {
    return (
      <div className="grid min-h-svh place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!supabase) return
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <VocaLogo />

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Accept invitation</h1>
            <p className="text-sm text-muted-foreground">
              Choose a password for your VOCA account, then you will be signed in.
            </p>
          </div>

          {error ? (
            <div className="grid gap-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                Back to sign in
              </Button>
            </div>
          ) : hasSession ? (
            <form className="grid gap-4" onSubmit={(e) => void handleSetPassword(e)}>
              <div className="grid gap-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  disabled={busy}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Set password and continue
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="hidden border-s border-border lg:block">
        <LoginArt />
      </div>
    </div>
  )
}