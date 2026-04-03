import { cn } from '@/lib/utils'

const NFL_TEAMS = new Set([
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
])

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const

interface TeamLogoProps {
  team: string | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function TeamLogo({ team, size = 'md', className }: TeamLogoProps) {
  const px = SIZE_MAP[size]
  const upperTeam = team?.toUpperCase() ?? ''
  const isValid = NFL_TEAMS.has(upperTeam)

  if (!team || !isValid) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold shrink-0',
          size === 'sm' && 'text-[8px]',
          size === 'md' && 'text-[10px]',
          size === 'lg' && 'text-xs',
          size === 'xl' && 'text-sm',
          className,
        )}
        style={{ width: px, height: px }}
        role="img"
        aria-label={team ? `${team} logo` : 'Unknown team'}
      >
        {team ? upperTeam.slice(0, 3) : '?'}
      </span>
    )
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}logos/nfl/${upperTeam}.svg`}
      alt={`${upperTeam} logo`}
      width={px}
      height={px}
      className={cn('shrink-0', className)}
      loading="lazy"
      onError={(e) => {
        const target = e.currentTarget
        target.style.display = 'none'
        const fallback = document.createElement('span')
        fallback.textContent = upperTeam
        fallback.className = 'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold'
        fallback.style.width = `${px}px`
        fallback.style.height = `${px}px`
        fallback.style.fontSize = `${px * 0.4}px`
        target.parentNode?.insertBefore(fallback, target)
      }}
    />
  )
}
