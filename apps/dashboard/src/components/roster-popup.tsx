import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RosterPopupProps {
  open: boolean
  onClose: () => void
  title: string
  players: string[]
  playerMap: Map<string, string> | undefined
}

export function RosterPopup({ open, onClose, title, players, playerMap }: RosterPopupProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-gray-700/50 bg-bg-secondary p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-gray-100">{title}</p>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-gray-500 hover:text-gray-300" />
          </button>
        </div>
        {players.length > 0 ? (
          <div
            className={cn(
              'grid gap-x-4 gap-y-1',
              players.length >= 20 ? 'grid-cols-3' : 'grid-cols-2',
            )}
          >
            {players.map((playerId) => (
              <p key={playerId} className="truncate text-xs text-gray-300">
                {playerMap?.get(playerId) ?? (playerMap ? playerId : 'Loading...')}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">No players</p>
        )}
      </div>
    </div>
  )
}
