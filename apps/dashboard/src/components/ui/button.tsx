import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-accent text-gray-100 hover:bg-accent/90',
  outline: 'border border-gray-700/50 bg-transparent hover:bg-gray-800/50 text-gray-100',
  ghost: 'hover:bg-gray-800/50 text-gray-100',
  destructive: 'bg-loss text-gray-100 hover:bg-loss/90',
} as const

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-8 text-base',
  icon: 'h-10 w-10',
} as const

interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
