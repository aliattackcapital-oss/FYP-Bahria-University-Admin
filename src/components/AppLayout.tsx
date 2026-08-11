import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, PhoneCall, Sparkles, Users } from 'lucide-react'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Brand } from '@/components/Brand'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/call-logs', label: 'Call Logs', icon: PhoneCall, end: false },
  { to: '/members', label: 'Members', icon: Users, end: false },
]

const creatorsItem = {
  to: '/creators',
  label: 'Creators',
  icon: Sparkles,
  end: false,
}

export function AppLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-e bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center px-4">
          <Brand compact />
        </div>

        <Separator />

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
            General
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <NavLink
            to={creatorsItem.to}
            end={creatorsItem.end}
            className={({ isActive }) =>
              cn(
                'mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
              )
            }
          >
            <creatorsItem.icon className="size-4" />
            {creatorsItem.label}
          </NavLink>
          <ThemeSwitch />
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Brand compact />
          </div>

          <nav className="flex items-center gap-1 md:hidden">
            {[...navItems, creatorsItem].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2.5 py-1.5 text-sm font-medium',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
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

        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
