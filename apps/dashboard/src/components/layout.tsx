import { useState } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Swords,
  FileText,
  ArrowRightLeft,
  Trophy,
  Scale,
  TrendingUp,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useDisplayName } from '@/hooks/use-display-name'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useLastSynced } from '@/hooks/use-league-data'
import { cn, formatRelativeTime } from '@/lib/utils'

const navGroups = [
  {
    label: 'League',
    items: [
      { to: '/' as const, label: 'Overview', icon: LayoutDashboard },
      { to: '/matchups' as const, label: 'Matchups', icon: Swords },
      { to: '/playoffs' as const, label: 'Playoffs', icon: Trophy },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/players' as const, label: 'Players', icon: Users },
      { to: '/draft' as const, label: 'Draft', icon: FileText },
      { to: '/transactions' as const, label: 'Transactions', icon: ArrowRightLeft },
      { to: '/h2h' as const, label: 'Head-to-Head', icon: Scale },
      { to: '/rankings' as const, label: 'Power Rankings', icon: TrendingUp },
    ],
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { leagueName, setLeagueName, season, setSeason, leagueFamilies, availableSeasons } = useLeagueContext()
  const { mode, setMode } = useDisplayName()
  const matchRoute = useMatchRoute()
  const { data: lastSynced } = useLastSynced()

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

        <div className="border-b border-gray-700/50 px-4 py-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">League</label>
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

        <div className="border-b border-gray-700/50 px-4 py-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'team' ? 'user' : 'team')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-gray-200"
            title={mode === 'team' ? 'Showing team names' : 'Showing user names'}
          >
            {mode === 'team' ? (
              <Shield className="h-3.5 w-3.5" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            <span>{mode === 'team' ? 'Team Names' : 'User Names'}</span>
          </button>
        </div>

        <nav className="flex-1 space-y-4 p-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <span className="mb-1 block px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {group.label}
              </span>
              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-auto min-h-16 flex-wrap items-center gap-2 border-b border-gray-700/50 bg-bg-secondary px-4 py-2 lg:h-16 lg:gap-4 lg:px-6 lg:py-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
            <h2 className="truncate text-base font-semibold text-gray-100 lg:text-lg">
              {leagueName}{season ? ` — ${season}` : ''}
            </h2>
            <div className="flex items-center gap-2">
              <Select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-28 lg:w-36"
              >
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                {availableSeasons.length === 0 && (
                  <option value="">Loading…</option>
                )}
              </Select>
              {lastSynced && (
                <span
                  className="hidden text-xs text-gray-500 sm:inline"
                  title={new Date(lastSynced).toLocaleString()}
                >
                  Synced {formatRelativeTime(new Date(lastSynced).getTime())}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
