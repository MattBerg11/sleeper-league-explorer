import { useState, useMemo } from 'react'
import { ArrowRightLeft, Plus, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useTransactions, usePlayerMap } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { ErrorAlert } from '@/components/error-alert'

const TYPE_LABELS: Record<string, string> = {
  trade: 'Trade',
  waiver: 'Waiver',
  free_agent: 'Free Agent',
  commissioner: 'Commissioner',
}

const TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'win' | 'loss'> = {
  trade: 'default',
  waiver: 'secondary',
  free_agent: 'win',
  commissioner: 'outline',
}

export function TransactionFeedPage() {
  const { leagueId } = useLeagueContext()
  const { data: transactions = [], isLoading, error } = useTransactions(leagueId)
  const { data: playerMap } = usePlayerMap()
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = useMemo(() => {
    if (!typeFilter) return transactions
    return transactions.filter((t) => t.type === typeFilter)
  }, [transactions, typeFilter])

  const types = useMemo(() => {
    const set = new Set(transactions.map((t) => t.type))
    return Array.from(set)
  }, [transactions])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-100">Transactions</h2>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorAlert error={error} title="Error loading transactions" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Transactions</h2>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-40"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-400">
              No transactions found
            </CardContent>
          </Card>
        ) : (
          filtered.map((tx) => (
            <Card key={tx.transaction_id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-5 w-5 text-accent" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={TYPE_VARIANTS[tx.type] ?? 'outline'}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {tx.created ? new Date(tx.created).toLocaleDateString() : 'Unknown date'}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {tx.adds && Object.keys(tx.adds).map((playerId) => (
                          <div key={`add-${playerId}`} className="flex items-center gap-2 text-sm">
                            <Plus className="h-3 w-3 text-win" />
                            <span className="text-win">Added</span>
                            <span className="text-gray-300">{playerMap?.get(playerId) ?? playerId}</span>
                          </div>
                        ))}
                        {tx.drops && Object.keys(tx.drops).map((playerId) => (
                          <div key={`drop-${playerId}`} className="flex items-center gap-2 text-sm">
                            <Minus className="h-3 w-3 text-loss" />
                            <span className="text-loss">Dropped</span>
                            <span className="text-gray-300">{playerMap?.get(playerId) ?? playerId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{tx.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}