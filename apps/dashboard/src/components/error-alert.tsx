import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorAlertProps {
  error: Error | unknown
  reset?: () => void
  title?: string
}

export function ErrorAlert({ error, reset, title = 'Something went wrong' }: ErrorAlertProps) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  return (
    <Card className="border-loss/30 bg-loss/5">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <AlertTriangle className="h-5 w-5 text-loss" />
        <CardTitle className="text-loss">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-400">{message}</p>
      </CardContent>
      {reset && (
        <CardFooter>
          <Button variant="outline" onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
