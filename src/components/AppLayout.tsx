import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  Building2,
  LayoutDashboard,
  LogOut,
  ClipboardList,
  Flag,
  PhoneCall,
  ScrollText,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { VocaLogo } from '@/components/VocaLogo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const generalItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/call-logs', label: 'Call Logs', icon: PhoneCall, end: false },
  { to: '/review-queue', label: 'Review queue', icon: ClipboardList, end: false },
  { to: '/members', label: 'Members', icon: Users, end: false },
]

const agentSettingsItems = [
  { to: '/knowledge-base', label: 'Agent Knowledgebase', icon: BookOpen, end: false },
  { to: '/agent-prompt', label: 'Agent prompt', icon: FileText, end: false },
]

function navClassName(isActive: boolean) {
  return cn(
    'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
  )
}

export function AppLayout() {
  const navigate = useNavigate()
  const { member, organizationName, orgRole, signOut } = useAuth()
  const canViewMembers =
    orgRole === 'super_admin' || orgRole === 'admin' || orgRole === 'front_desk'
  const isFrontDesk = orgRole === 'front_desk'
  const isSuperAdmin = orgRole === 'super_admin'
  const navGeneral = generalItems.filter((item) => {
    if (item.to === '/members' && !canViewMembers) return false
    if (item.to === '/review-queue' && !isFrontDesk) return false
    return true
  })
  const navAdminOnly = isSuperAdmin
    ? [
        { to: '/activity', label: 'Activity', icon: ScrollText, end: false as const },
        { to: '/flagged-calls', label: 'Flagged calls', icon: Flag, end: false as const },
      ]
    : []
  const canAccessKnowledgeBase = orgRole === 'super_admin' || orgRole === 'admin'
  const navAgentSettings = canAccessKnowledgeBase ? agentSettingsItems : []

  const handleLogout = () => {
    void signOut().then(() => navigate('/login', { replace: true }))
  }

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-e bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 flex-col justify-center gap-0.5 px-4">
          <VocaLogo className="text-xl" />
          {member ? (
            <p className="truncate text-xs text-muted-foreground">
              {member.name} · {member.role}
            </p>
          ) : null}
        </div>

        <Separator />

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
            Organization
          </p>
          <div className={navClassName(true)}>
            <Building2 className="size-4" />
            {organizationName ?? 'Bahria University'}
          </div>

          <p className="mb-1 mt-4 px-2 text-xs font-medium text-muted-foreground">
            General
          </p>
          {navGeneral.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navClassName(isActive)}
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}

          {navAdminOnly.length > 0 ? (
            <>
              <p className="mb-1 mt-4 px-2 text-xs font-medium text-muted-foreground">
                Super admin
              </p>
              {navAdminOnly.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => navClassName(isActive)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </>
          ) : null}

          {navAgentSettings.length > 0 ? (
            <>
              <p className="mb-1 mt-4 px-2 text-xs font-medium text-muted-foreground">
                Agent Settings
              </p>
              {navAgentSettings.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => navClassName(isActive)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </>
          ) : null}
        </nav>

        <div className="mt-auto flex shrink-0 flex-col gap-1 p-3">
          <ThemeSwitch />
          <button
            type="button"
            className={navClassName(false)}
            onClick={handleLogout}
          >
            <LogOut className="size-4 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-40 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <VocaLogo className="text-lg" />
          </div>

          <nav className="flex items-center gap-1 md:hidden">
            {[...navGeneral, ...navAdminOnly, ...navAgentSettings].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2.5 py-1.5 text-sm font-medium',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2 md:hidden">
            <ThemeSwitch compact />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
