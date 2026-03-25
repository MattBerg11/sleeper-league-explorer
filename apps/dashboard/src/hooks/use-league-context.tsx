import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { LEAGUE_IDS } from '@sleeper-explorer/shared'
import { useLeagues } from '@/hooks/use-league-data'
import type { LeagueRow } from '@sleeper-explorer/shared'

interface LeagueContextValue {
  leagueId: string
  setLeagueId: (id: string) => void
  leagues: LeagueRow[]
  isLoading: boolean
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

interface LeagueProviderProps {
  children: ReactNode
}

export function LeagueProvider({ children }: LeagueProviderProps) {
  const [leagueId, setLeagueIdState] = useState<string>(LEAGUE_IDS.ALF)
  const { data: leagues = [], isLoading } = useLeagues()

  const setLeagueId = useCallback((id: string) => {
    setLeagueIdState(id)
  }, [])

  return (
    <LeagueContext value={{ leagueId, setLeagueId, leagues, isLoading }}>
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
