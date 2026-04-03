import { createContext, useContext, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useLeagues } from '@/hooks/use-league-data'
import type { LeagueRow } from '@sleeper-explorer/shared'

export interface LeagueFamily {
  name: string
  seasons: { season: string; leagueId: string }[]
}

interface LeagueContextValue {
  leagueId: string
  leagueName: string
  setLeagueName: (name: string) => void
  season: string
  setSeason: (season: string) => void
  leagueFamilies: LeagueFamily[]
  availableSeasons: string[]
  leagues: LeagueRow[]
  leagueStatus: string
  isLoading: boolean
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

interface LeagueProviderProps {
  children: ReactNode
}

export function LeagueProvider({ children }: LeagueProviderProps) {
  const { data: leagues = [], isLoading } = useLeagues()
  const search = useSearch({ from: '__root__' })
  const navigate = useNavigate()

  const leagueName = search.league ?? 'ALF'
  const seasonParam = search.season ?? ''

  const leagueFamilies = useMemo<LeagueFamily[]>(() => {
    const familyMap = new Map<string, { season: string; leagueId: string }[]>()
    for (const league of leagues) {
      const existing = familyMap.get(league.name) ?? []
      existing.push({ season: league.season, leagueId: league.league_id })
      familyMap.set(league.name, existing)
    }
    return Array.from(familyMap.entries())
      .map(([name, seasons]) => ({
        name,
        seasons: seasons.sort((a, b) => b.season.localeCompare(a.season)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [leagues])

  const availableSeasons = useMemo(() => {
    const family = leagueFamilies.find((f) => f.name === leagueName)
    return family?.seasons.map((s) => s.season) ?? []
  }, [leagueFamilies, leagueName])

  const effectiveSeason = availableSeasons.includes(seasonParam)
    ? seasonParam
    : availableSeasons[0] ?? ''

  const leagueId = useMemo(() => {
    const family = leagueFamilies.find((f) => f.name === leagueName)
    const match = family?.seasons.find((s) => s.season === effectiveSeason)
    return match?.leagueId ?? ''
  }, [leagueFamilies, leagueName, effectiveSeason])

  const leagueStatus = useMemo(() => {
    const league = leagues.find((l) => l.league_id === leagueId)
    return league?.status ?? ''
  }, [leagues, leagueId])

  const setLeagueName = useCallback((name: string) => {
    void navigate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: ((prev: Record<string, unknown>) => ({ ...prev, league: name, season: undefined })) as any,
    })
  }, [navigate])

  const setSeason = useCallback((s: string) => {
    void navigate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: ((prev: Record<string, unknown>) => ({ ...prev, season: s })) as any,
    })
  }, [navigate])

  return (
    <LeagueContext value={{
      leagueId,
      leagueName,
      setLeagueName,
      season: effectiveSeason,
      setSeason,
      leagueFamilies,
      availableSeasons,
      leagues,
      leagueStatus,
      isLoading,
    }}>
      {children}
    </LeagueContext>
  )
}

export function useLeagueContext(): LeagueContextValue {
  const context = useContext(LeagueContext)
  if (!context) {
    throw new Error('useLeagueContext must be used within a LeagueProvider')
  }
  return context
}
