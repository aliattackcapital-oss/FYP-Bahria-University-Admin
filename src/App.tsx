import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { isAuthenticated } from '@/lib/auth'
import { CallLogs } from '@/pages/CallLogs'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { Creators } from '@/pages/Creators'
import { KnowledgeBase } from '@/pages/KnowledgeBase'
import { Members } from '@/pages/Members'

function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
  )
}
