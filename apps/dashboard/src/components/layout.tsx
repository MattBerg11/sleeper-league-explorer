import { useState } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Swords,
  FileText,
  ArrowRightLeft,
  Trophy,
  Menu,
  X,
} from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLeagueContext } from '@/hooks/use-league-context'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'League Overview', icon: LayoutDashboard },
  { to: '/players', label: 'Player Explorer', icon: Users },
  { to: '/matchups', label: 'Matchups', icon: Swords },
  { to: '/draft', label: 'Draft Recap', icon: FileText },
  { to: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { to: '/playoffs', label: 'Playoffs', icon: Trophy },
] as const

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { leagueName, setLeagueName, season, setSeason, leagueFamilies, availableSeasons } = useLeagueContext()
  const matchRoute = useMatchRoute()

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false) }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-700/50 bg-bg-secondary transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-700/50 px-6">
          <h1 className="text-lg font-bold text-accent">Sleeper Explorer</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = matchRoute({ to: item.to, fuzzy: item.to !== '/' })
              || (item.to === '/' && matchRoute({ to: '/' }))
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                search={(prev: Record<string, unknown>) => prev}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/20 text-accent'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-700/50 p-4">
          <label className="mb-1 block text-xs font-medium text-gray-400">League</label>
          <Select
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            className="w-full"
          >
            {leagueFamilies.map((family) => (
              <option key={family.name} value={family.name}>
                {family.name}
              </option>
            ))}
            {leagueFamilies.length === 0 && (
              <option value={leagueName}>Loading…</option>
            )}
          </Select>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-700/50 bg-bg-secondary px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100">
              {leagueName}{season ? ` — ${season}` : ''}
            </h2>
            <div className="flex items-center gap-2">
              <Select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-36"
              >
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                {availableSeasons.length === 0 && (
                  <option value="">Loading…</option>
                )}
              </Select>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
