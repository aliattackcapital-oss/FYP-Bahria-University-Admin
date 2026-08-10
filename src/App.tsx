import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { isAuthenticated } from '@/lib/auth'
import { CallLogs } from '@/pages/CallLogs'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'

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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
