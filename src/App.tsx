import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { CallLogs } from '@/pages/CallLogs'
import { Dashboard } from '@/pages/Dashboard'
import { AcceptInvite } from '@/pages/AcceptInvite'
import { Login } from '@/pages/Login'
import { Creators } from '@/pages/Creators'
import { KnowledgeBase } from '@/pages/KnowledgeBase'
import { Members } from '@/pages/Members'

/** Supabase may send invite tokens to Site URL (/) instead of /accept-invite. */
function InviteAuthRedirect() {
  const location = useLocation()
  useEffect(() => {
    if (location.pathname !== '/') return
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const hasAuthInUrl =
      hash.includes('access_token') ||
      params.has('code') ||
      params.has('token_hash')
    if (!hasAuthInUrl) return
    const tail = `${window.location.search}${window.location.hash}`
    window.location.replace(`/accept-invite${tail}`)
  }, [location.pathname, location.search, location.hash])
  return null
}

function ProtectedRoute() {
  const { loading, isActive } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isActive) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <InviteAuthRedirect />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="call-logs" element={<CallLogs />} />
            <Route path="members" element={<Members />} />
            <Route path="knowledge-base" element={<KnowledgeBase />} />
            <Route path="creators" element={<Creators />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}