import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-accent/20 text-accent border-accent/30',
  secondary: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
  destructive: 'bg-loss/20 text-loss border-loss/30',
  outline: 'bg-transparent text-gray-300 border-gray-600/50',
  win: 'bg-win/10 text-win border-win/30',
  loss: 'bg-loss/10 text-loss border-loss/30',
} as const

interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: keyof typeof variants
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
