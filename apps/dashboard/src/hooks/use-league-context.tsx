import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
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
  isLoading: boolean
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

interface LeagueProviderProps {
  children: ReactNode
}

export function LeagueProvider({ children }: LeagueProviderProps) {
  const { data: leagues = [], isLoading } = useLeagues()
  const [leagueName, setLeagueNameState] = useState('ALF')
  const [season, setSeason] = useState('')

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

  const effectiveSeason = availableSeasons.includes(season)
    ? season
    : availableSeasons[0] ?? ''

  const leagueId = useMemo(() => {
    const family = leagueFamilies.find((f) => f.name === leagueName)
    const match = family?.seasons.find((s) => s.season === effectiveSeason)
    return match?.leagueId ?? ''
  }, [leagueFamilies, leagueName, effectiveSeason])

  const setLeagueName = useCallback((name: string) => {
    setLeagueNameState(name)
    setSeason('')
  }, [])

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
