'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  glowColor?: 'brand' | 'success' | 'warning' | 'danger'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function Card({
  children,
  className,
  hover = false,
  glow = false,
  glowColor = 'brand',
  padding = 'md',
  onClick,
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  const glowClasses = {
    brand: 'shadow-brand-500/20',
    success: 'shadow-emerald-500/20',
    warning: 'shadow-amber-500/20',
    danger: 'shadow-red-500/20',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-dark-border bg-dark-card/80 backdrop-blur-xl',
        'transition-all duration-200',
        paddingClasses[padding],
        hover && 'cursor-pointer hover:bg-dark-hover hover:border-dark-border/80',
        glow && `shadow-lg ${glowClasses[glowColor]}`,
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
  }
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({ title, value, change, icon, trend, className }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-dark-muted',
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-dark-muted">{title}</span>
          {icon && (
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">{icon}</div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <motion.span
            className="text-3xl font-bold text-dark-text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={value}
          >
            {value}
          </motion.span>

          {change && (
            <div className={cn('flex items-center gap-1 text-sm', trendColors[trend || 'neutral'])}>
              {trend === 'up' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{change.value > 0 ? '+' : ''}{change.value}%</span>
              <span className="text-dark-muted">{change.label}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6',
        'bg-gradient-to-br from-white/10 to-white/5',
        'backdrop-blur-xl',
        'border border-white/10',
        'shadow-xl shadow-black/20',
        className
      )}
    >
      {children}
    </div>
  )
}
