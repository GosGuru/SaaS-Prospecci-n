'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  leftIcon?: React.ReactNode
  icon?: React.ReactNode // Alias for leftIcon
  rightIcon?: React.ReactNode
  onClear?: () => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, icon, rightIcon, onClear, type = 'text', ...props }, ref) => {
    const iconElement = leftIcon || icon
    return (
      <div className="relative w-full">
        {iconElement && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted">
            {iconElement}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full rounded-lg border bg-dark-card px-4 py-2.5',
            'text-dark-text placeholder:text-dark-muted',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-dark-border focus:border-brand-500 focus:ring-brand-500/20',
            iconElement && 'pl-10',
            (rightIcon || onClear) && 'pr-10',
            className
          )}
          {...props}
        />
        {(rightIcon || onClear) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {onClear && props.value ? (
              <button
                type="button"
                onClick={onClear}
                className="text-dark-muted hover:text-dark-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              rightIcon && <span className="text-dark-muted">{rightIcon}</span>
            )}
          </div>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Search Input variant
export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        leftIcon={<Search className="w-4 h-4" />}
        placeholder="Buscar..."
        className={cn(className)}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export { Input, SearchInput }
