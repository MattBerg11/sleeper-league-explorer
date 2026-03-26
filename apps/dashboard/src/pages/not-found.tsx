import { Link } from '@tanstack/react-router'
import { FileQuestion, Home } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <FileQuestion className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Back to Overview
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
