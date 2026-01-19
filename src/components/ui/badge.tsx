'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-dark-border text-dark-text',
    brand: 'bg-brand-500/20 text-brand-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    neutral: 'bg-dark-hover text-dark-muted',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }

  const dotColors = {
    default: 'bg-dark-text',
    brand: 'bg-brand-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    neutral: 'bg-dark-muted',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away'
  showLabel?: boolean
  className?: string
}

export function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'bg-emerald-500', label: 'En línea' },
    offline: { color: 'bg-gray-500', label: 'Desconectado' },
    busy: { color: 'bg-red-500', label: 'Ocupado' },
    away: { color: 'bg-amber-500', label: 'Ausente' },
  }

  const config = statusConfig[status]

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full', config.color)} />
      {showLabel && <span className="text-xs text-dark-muted">{config.label}</span>}
    </span>
  )
}
