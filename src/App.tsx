import { useEffect, type ReactNode } from 'react'
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
import { PlatformDashboard } from '@/pages/PlatformDashboard'
import { PlatformOrganizations } from '@/pages/PlatformOrganizations'

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

function HomeRoute() {
  const { isPlatform } = useAuth()
  if (isPlatform) return <Navigate to="/platform/dashboard" replace />
  return <Dashboard />
}

function PlatformShell() {
  const { isPlatform } = useAuth()
  if (!isPlatform) return <Navigate to="/" replace />
  return <Outlet />
}

function OrgOnlyRoute({ children }: { children: ReactNode }) {
  const { isPlatform } = useAuth()
  if (isPlatform) return <Navigate to="/platform/dashboard" replace />
  return <>{children}</>
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
            <Route index element={<HomeRoute />} />
            <Route path="platform" element={<PlatformShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PlatformDashboard />} />
              <Route path="organizations" element={<PlatformOrganizations />} />
            </Route>
            <Route
              path="call-logs"
              element={
                <OrgOnlyRoute>
                  <CallLogs />
                </OrgOnlyRoute>
              }
            />
            <Route path="review-queue" element={<OrgOnlyRoute><ReviewQueue /></OrgOnlyRoute>} />
            <Route path="review-queue/:callId" element={<OrgOnlyRoute><ReviewCall /></OrgOnlyRoute>} />
            <Route path="activity" element={<OrgOnlyRoute><ActivityLogs /></OrgOnlyRoute>} />
            <Route path="flagged-calls" element={<OrgOnlyRoute><FlaggedCalls /></OrgOnlyRoute>} />
            <Route path="flagged-calls/:flagId" element={<OrgOnlyRoute><FlaggedCallReview /></OrgOnlyRoute>} />
            <Route path="members" element={<OrgOnlyRoute><Members /></OrgOnlyRoute>} />
            <Route path="knowledge-base" element={<OrgOnlyRoute><KnowledgeBaseRoute /></OrgOnlyRoute>} />
            <Route path="agent-prompt" element={<OrgOnlyRoute><AgentPromptRoute /></OrgOnlyRoute>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}