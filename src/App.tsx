import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { CallLogs } from '@/pages/CallLogs'
import { ReviewCall } from '@/pages/ReviewCall'
import { ReviewQueue } from '@/pages/ReviewQueue'
import { Dashboard } from '@/pages/Dashboard'
import { ActivityLogs } from '@/pages/ActivityLogs'
import { AcceptInvite } from '@/pages/AcceptInvite'
import { Login } from '@/pages/Login'
import { AgentPrompt } from '@/pages/AgentPrompt'
import { KnowledgeBase } from '@/pages/KnowledgeBase'
import { FlaggedCallReview } from '@/pages/FlaggedCallReview'
import { FlaggedCalls } from '@/pages/FlaggedCalls'
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

function KnowledgeBaseRoute() {
  const { orgRole } = useAuth()
  if (orgRole === 'front_desk') {
    return <Navigate to="/" replace />
  }
  return <KnowledgeBase />
}

function AgentPromptRoute() {
  const { orgRole } = useAuth()
  if (orgRole === 'front_desk') {
    return <Navigate to="/" replace />
  }
  return <AgentPrompt />
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
            <Route path="review-queue" element={<ReviewQueue />} />
            <Route path="review-queue/:callId" element={<ReviewCall />} />
            <Route path="activity" element={<ActivityLogs />} />
            <Route path="flagged-calls" element={<FlaggedCalls />} />
            <Route path="flagged-calls/:flagId" element={<FlaggedCallReview />} />
            <Route path="members" element={<Members />} />
            <Route path="knowledge-base" element={<KnowledgeBaseRoute />} />
            <Route path="agent-prompt" element={<AgentPromptRoute />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}