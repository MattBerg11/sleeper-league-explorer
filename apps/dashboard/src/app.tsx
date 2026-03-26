import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ErrorBoundary } from '@/components/error-boundary'
import { DisplayNameProvider } from '@/hooks/use-display-name'
import { ThemeProvider } from '@/hooks/use-theme'
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
      <ThemeProvider>
        <DisplayNameProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </DisplayNameProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}