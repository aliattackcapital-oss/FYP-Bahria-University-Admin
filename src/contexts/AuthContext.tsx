import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Member } from '@/types'
import { completeAuthFromCurrentUrl, isAcceptInvitePath } from '@/lib/authSessionFromUrl'
import { supabase, supabaseConfigured } from '@/lib/supabaseClient'

export type OrgRole = 'super_admin' | 'admin' | 'front_desk'

type AuthState = {
  loading: boolean
  sessionReady: boolean
  accessToken: string | null
  userEmail: string | null
  member: Member | null
  orgRole: OrgRole | null
  organizationName: string | null
  error: string | null
}

type AuthContextValue = AuthState & {
  isActive: boolean
  isSuperAdmin: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function activateAndLoad(token: string) {
  const activate = await fetch('/api/auth/activate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const activateBody = (await activate.json()) as { error?: string }
  if (!activate.ok) {
    throw new Error(activateBody.error || 'Activation failed')
  }

  const me = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meBody = (await me.json()) as {
    member?: Member
    organization?: { name: string }
    error?: string
  }
  if (!me.ok) {
    throw new Error(meBody.error || 'Could not load profile')
  }
  return meBody
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    sessionReady: false,
    accessToken: null,
    userEmail: null,
    member: null,
    orgRole: null,
    organizationName: null,
    error: null,
  })

  const applyProfile = useCallback(
    (token: string | null, member: Member | null, orgName: string | null, error: string | null) => {
      setState({
        loading: false,
        sessionReady: true,
        accessToken: token,
        userEmail: member?.email ?? null,
        member,
        orgRole: (member?.orgRole as OrgRole | undefined) ?? null,
        organizationName: orgName,
        error,
      })
    },
    [],
  )

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      applyProfile(null, null, null, 'Supabase auth is not configured in the app.')
      return
    }

    if (isAcceptInvitePath()) {
      const { data } = await completeAuthFromCurrentUrl(supabase)
      const token = data.session?.access_token
      if (token) {
        applyProfile(token, null, null, null)
      } else {
        applyProfile(null, null, null, null)
      }
      return
    }

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      applyProfile(null, null, null, null)
      return
    }
    try {
      const body = await activateAndLoad(token)
      applyProfile(token, body.member ?? null, body.organization?.name ?? null, null)
    } catch (err) {
      await supabase.auth.signOut()
      applyProfile(
        null,
        null,
        null,
        err instanceof Error ? err.message : 'Sign-in failed',
      )
    }
  }, [applyProfile])

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setState((s) => ({
        ...s,
        loading: false,
        sessionReady: true,
        error: 'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY',
      }))
      return
    }

    void refreshProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void refreshProfile()
      }
      if (event === 'SIGNED_OUT') {
        applyProfile(null, null, null, null)
      }
    })

    return () => subscription.unsubscribe()
  }, [applyProfile, refreshProfile])

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error('Auth is not configured')
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      await refreshProfile()
    },
    [refreshProfile],
  )

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    applyProfile(null, null, null, null)
  }, [applyProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isActive: Boolean(state.member && state.member.orgStatus === 'active'),
      isSuperAdmin: state.orgRole === 'super_admin',
      signInWithPassword,
      signOut,
      refreshProfile,
    }),
    [state, signInWithPassword, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}