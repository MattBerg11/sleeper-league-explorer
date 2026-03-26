import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? 'Dark mode' : theme === 'light' ? 'Light mode' : 'System theme'

  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label={label} title={label}>
      <Icon className="h-4 w-4" />
    </Button>
  )
}
