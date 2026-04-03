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
  Clipboard,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
      { to: '/pre-draft' as const, label: 'Pre-Draft', icon: Clipboard },
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
        <div className="flex flex-col border-b border-gray-700/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-accent">League Explorer</h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {lastSynced && (
            <span
              className="mt-1 text-[10px] text-gray-500"
              title={new Date(lastSynced).toLocaleString()}
            >
              Synced {formatRelativeTime(new Date(lastSynced).getTime())}
            </span>
          )}
        </div>

        <div className="border-b border-gray-700/50 px-4 py-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">League</label>
          <Select value={leagueName} onValueChange={setLeagueName}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select league…" />
            </SelectTrigger>
            <SelectContent>
              {leagueFamilies.map((family) => (
                <SelectItem key={family.name} value={family.name}>
                  {family.name}
                </SelectItem>
              ))}
              {leagueFamilies.length === 0 && (
                <SelectItem value={leagueName}>Loading…</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="border-b border-gray-700/50 px-4 py-2">
          <div className="flex w-full rounded-full bg-gray-800/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode('team')}
              className={cn(
                'flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                mode === 'team'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200',
              )}
            >
              Teams
            </button>
            <button
              type="button"
              onClick={() => setMode('user')}
              className={cn(
                'flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                mode === 'user'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200',
              )}
            >
              Users
            </button>
          </div>
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
            <Select value={leagueName} onValueChange={setLeagueName}>
              <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent px-0 py-0 text-base font-semibold text-gray-100 ring-offset-0 focus:ring-0 focus:ring-offset-0 lg:text-lg [&>span]:line-clamp-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leagueFamilies.map((family) => (
                  <SelectItem key={family.name} value={family.name}>
                    {family.name}
                  </SelectItem>
                ))}
                {leagueFamilies.length === 0 && (
                  <SelectItem value={leagueName}>Loading…</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {(() => {
                const currentIndex = availableSeasons.indexOf(season)
                const isOldest = currentIndex >= availableSeasons.length - 1
                const isNewest = currentIndex <= 0
                return (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8', isOldest && 'invisible')}
                      onClick={() => setSeason(availableSeasons[currentIndex + 1])}
                      aria-label="Previous season"
                      tabIndex={isOldest ? -1 : undefined}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[3ch] text-center text-sm font-medium text-gray-100">
                      {season}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8', isNewest && 'invisible')}
                      onClick={() => setSeason(availableSeasons[currentIndex - 1])}
                      aria-label="Next season"
                      tabIndex={isNewest ? -1 : undefined}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })()}
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
