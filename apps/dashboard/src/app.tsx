import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { LeagueProvider } from '@/hooks/use-league-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { router } from '@/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <LeagueProvider>
          <RouterProvider router={router} />
        </LeagueProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}