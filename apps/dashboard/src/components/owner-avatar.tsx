import { cn } from '@/lib/utils'

interface OwnerAvatarProps {
  avatarId: string | null | undefined
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function OwnerAvatar({ avatarId, name, size = 'md', className }: OwnerAvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (avatarId) {
    return (
      <img
        src={`https://sleepercdn.com/avatars/thumbs/${avatarId}`}
        alt={name}
        className={cn('rounded-full object-cover', SIZES[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-accent/20 font-medium text-accent',
        SIZES[size],
        className,
      )}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
