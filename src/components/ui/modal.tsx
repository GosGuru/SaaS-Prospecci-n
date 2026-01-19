'use client'

import { Fragment, type ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
}: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform overflow-hidden rounded-2xl',
                  'bg-dark-card border border-dark-border',
                  'shadow-2xl shadow-black/40',
                  'transition-all',
                  sizeClasses[size]
                )}
              >
                {/* Header */}
                {(title || showClose) && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
                    <div>
                      {title && (
                        <Dialog.Title className="text-lg font-semibold text-dark-text">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-dark-muted">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showClose && (
                      <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="px-6 py-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  message?: string // Alias for description
  confirmText?: string
  confirmLabel?: string // Alias for confirmText
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmText = 'Confirmar',
  confirmLabel,
  cancelText = 'Cancelar',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const descriptionText = description || message
  const confirmButtonText = confirmLabel || confirmText
  const variantClasses = {
    danger: 'bg-danger hover:bg-danger-dark',
    warning: 'bg-warning hover:bg-warning/90',
    default: 'bg-brand-500 hover:bg-brand-600',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center py-4">
        <h3 className="text-lg font-semibold text-dark-text mb-2">{title}</h3>
        {descriptionText && <p className="text-dark-muted text-sm mb-6">{descriptionText}</p>}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-dark-hover text-dark-text hover:bg-dark-border transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50',
              variantClasses[variant]
            )}
          >
            {isLoading ? 'Cargando...' : confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
