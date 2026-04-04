import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface OwnerAvatarProps {
  avatarId: string | null | undefined
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullSize?: boolean
  className?: string
}

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-base',
}

function Initials({ name, size, className }: { name: string; size: keyof typeof SIZES; className?: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

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

export function OwnerAvatar({ avatarId, name, size = 'md', fullSize = false, className }: OwnerAvatarProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!avatarId || errored) {
    return <Initials name={name} size={size} className={className} />
  }

  const src = fullSize
    ? `https://sleepercdn.com/avatars/${avatarId}`
    : `https://sleepercdn.com/avatars/thumbs/${avatarId}`

  return (
    <span className={cn('relative inline-flex shrink-0', SIZES[size], className)}>
      {!loaded && (
        <Skeleton className={cn('absolute inset-0 rounded-full', SIZES[size])} />
      )}
      <img
        src={src}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'rounded-full object-cover transition-opacity',
          SIZES[size],
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}
