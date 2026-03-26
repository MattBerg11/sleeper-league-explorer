import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type DisplayNameMode = 'team' | 'user'

interface DisplayNameContextValue {
  mode: DisplayNameMode
  setMode: (mode: DisplayNameMode) => void
  /** Returns team_name if mode is 'team' and team_name exists, otherwise display_name */
  getName: (owner: { display_name: string; team_name?: string | null }) => string
}

const DisplayNameContext = createContext<DisplayNameContextValue | null>(null)

const STORAGE_KEY = 'sleeper-display-name-mode'

export function DisplayNameProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DisplayNameMode>(() => {
    if (typeof window === 'undefined') return 'team'
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'user' ? 'user' : 'team'
  })

  const setMode = useCallback((next: DisplayNameMode) => {
    setModeState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const getName = useCallback(
    (owner: { display_name: string; team_name?: string | null }) => {
      if (mode === 'team' && owner.team_name) return owner.team_name
      return owner.display_name
    },
    [mode],
  )

  return (
    <DisplayNameContext value={{ mode, setMode, getName }}>
      {children}
    </DisplayNameContext>
  )
}

export function useDisplayName(): DisplayNameContextValue {
  const ctx = useContext(DisplayNameContext)
  if (!ctx) throw new Error('useDisplayName must be used within DisplayNameProvider')
  return ctx
}
