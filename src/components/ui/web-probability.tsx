'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getScoreColor, getScoreLabel, type ScoreColor } from '@/lib/scoring'

interface WebProbabilityBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function WebProbabilityBadge({
  score,
  showLabel = true,
  size = 'md',
  animated = true,
}: WebProbabilityBadgeProps) {
  const colorType: ScoreColor = getScoreColor(score)
  const label = getScoreLabel(score)

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-20 text-lg',
  }

  const colorClasses = {
    success: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    warning: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    danger: 'from-red-500 to-rose-600 shadow-red-500/30',
  }

  const bgColorClasses = {
    success: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    danger: 'bg-red-500/10',
  }

  const Component = animated ? motion.div : 'div'
  const animationProps = animated
    ? {
        initial: { scale: 0.5, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
      }
    : {}

  return (
    <div className="flex flex-col items-center gap-1">
      <Component
        className={cn(
          'relative rounded-full flex items-center justify-center font-bold',
          'bg-gradient-to-br shadow-lg',
          sizeClasses[size],
          colorClasses[colorType]
        )}
        {...animationProps}
      >
        {/* Glow effect */}
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-50',
            bgColorClasses[colorType]
          )}
        />
        
        {/* Score number */}
        <span className="relative z-10 text-white">{score}%</span>
        
        {/* Animated ring */}
        {animated && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full border-2',
              colorType === 'success' && 'border-emerald-400',
              colorType === 'warning' && 'border-amber-400',
              colorType === 'danger' && 'border-red-400'
            )}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </Component>

      {showLabel && (
        <span
          className={cn(
            'text-xs font-medium',
            colorType === 'success' && 'text-emerald-400',
            colorType === 'warning' && 'text-amber-400',
            colorType === 'danger' && 'text-red-400'
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}

interface ProbabilityBarProps {
  score: number
  showPercentage?: boolean
  height?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function ProbabilityBar({
  score,
  showPercentage = true,
  height = 'md',
  animated = true,
}: ProbabilityBarProps) {
  const colorType: ScoreColor = getScoreColor(score)

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const gradientClasses = {
    success: 'from-emerald-500 to-green-400',
    warning: 'from-amber-500 to-orange-400',
    danger: 'from-red-500 to-rose-400',
  }

  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-dark-muted">Probabilidad de necesitar web</span>
          <span
            className={cn(
              'text-sm font-semibold',
              colorType === 'success' && 'text-emerald-400',
              colorType === 'warning' && 'text-amber-400',
              colorType === 'danger' && 'text-red-400'
            )}
          >
            {score}%
          </span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-dark-border overflow-hidden', heightClasses[height])}>
        {animated ? (
          <motion.div
            className={cn('h-full rounded-full bg-gradient-to-r', gradientClasses[colorType])}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        ) : (
          <div
            className={cn('h-full rounded-full bg-gradient-to-r', gradientClasses[colorType])}
            style={{ width: `${score}%` }}
          />
        )}
      </div>
    </div>
  )
}
