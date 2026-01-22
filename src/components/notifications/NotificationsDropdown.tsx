'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Bell,
  MessageCircle,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Check,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotificationSound } from '@/lib/useNotificationSound'

interface Notification {
  id: string
  type: 'NEW_MESSAGE' | 'LEAD_ASSIGNED' | 'TASK_DUE' | 'TASK_ASSIGNED' | 'CAMPAIGN_COMPLETE' | 'SYSTEM'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  leadId?: string
  lead?: {
    id: string
    name: string
    businessName?: string
  }
  metadata?: Record<string, any>
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

const notificationIcons = {
  NEW_MESSAGE: MessageCircle,
  LEAD_ASSIGNED: UserPlus,
  TASK_DUE: Clock,
  TASK_ASSIGNED: CheckCircle,
  CAMPAIGN_COMPLETE: CheckCircle,
  SYSTEM: AlertCircle,
}

const notificationColors = {
  NEW_MESSAGE: 'text-brand-400 bg-brand-500/10',
  LEAD_ASSIGNED: 'text-purple-400 bg-purple-500/10',
  TASK_DUE: 'text-amber-400 bg-amber-500/10',
  TASK_ASSIGNED: 'text-blue-400 bg-blue-500/10',
  CAMPAIGN_COMPLETE: 'text-emerald-400 bg-emerald-500/10',
  SYSTEM: 'text-gray-400 bg-gray-500/10',
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const previousUnreadCountRef = useRef<number>(-1) // -1 = not initialized
  const hasInteractedRef = useRef(false)
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Notification sound hook
  const { play: playNotificationSound, enableSound } = useNotificationSound({
    volume: 0.6,
    enabled: soundEnabled,
  })

  // Enable sound on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true
        enableSound()
        document.removeEventListener('click', handleFirstInteraction)
        document.removeEventListener('keydown', handleFirstInteraction)
      }
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [enableSound])

  // Load sound preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notificationSoundEnabled')
    if (saved !== null) {
      setSoundEnabled(saved === 'true')
    }
  }, [])

  // Save sound preference and test sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev
      localStorage.setItem('notificationSoundEnabled', String(newValue))
      // Play sound when enabling to confirm it works
      if (newValue) {
        setTimeout(() => playNotificationSound(), 100)
      }
      return newValue
    })
  }, [playNotificationSound])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notifications
  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    refetchInterval: 15000, // Poll every 15 seconds for faster updates
    staleTime: 5000,
  })

  // Play sound when new notifications arrive
  useEffect(() => {
    const currentUnreadCount = data?.unreadCount ?? 0
    
    // Only play sound if unread count increased (new notification arrived)
    // Skip the initial load (when previousUnreadCountRef is -1)
    if (previousUnreadCountRef.current >= 0 && currentUnreadCount > previousUnreadCountRef.current) {
      console.log('New notification! Playing sound...', { 
        previous: previousUnreadCountRef.current, 
        current: currentUnreadCount 
      })
      playNotificationSound()
    }
    
    // Set to current count (use -1 as initial marker)
    if (previousUnreadCountRef.current === -1) {
      previousUnreadCountRef.current = currentUnreadCount
    } else {
      previousUnreadCountRef.current = currentUnreadCount
    }
  }, [data?.unreadCount, playNotificationSound])

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (!res.ok) throw new Error('Failed to mark all as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id])
    }

    // Navigate based on notification type - go directly to the chat
    if (notification.type === 'NEW_MESSAGE' && notification.leadId) {
      // Navigate to inbox with the specific lead selected
      router.push(`/dashboard/inbox?leadId=${notification.leadId}`)
      setIsOpen(false)
    } else if (notification.leadId) {
      router.push(`/dashboard/leads/${notification.leadId}`)
      setIsOpen(false)
    }
  }

  const unreadCount = data?.unreadCount ?? 0
  const notifications = data?.notifications ?? []

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-medium bg-brand-500 text-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-dark-text">Notificaciones</h3>
                <button
                  onClick={toggleSound}
                  className={cn(
                    "p-1 rounded transition-colors",
                    soundEnabled 
                      ? "text-brand-400 hover:bg-brand-500/10" 
                      : "text-dark-muted hover:bg-dark-hover"
                  )}
                  title={soundEnabled ? "Sonido activado" : "Sonido desactivado"}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Marcar todo leído
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-dark-muted" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-dark-muted">
                  <Bell className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type]
                  const colorClass = notificationColors[notification.type]

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                        'hover:bg-dark-hover',
                        !notification.isRead && 'bg-brand-500/5'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              notification.isRead ? 'text-dark-muted' : 'text-dark-text'
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-dark-muted mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.lead && (
                          <p className="text-xs text-brand-400 mt-1">
                            {notification.lead.businessName || notification.lead.name}
                          </p>
                        )}
                        <p className="text-[10px] text-dark-muted mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-dark-border">
                <button
                  onClick={() => {
                    router.push('/dashboard/notifications')
                    setIsOpen(false)
                  }}
                  className="w-full text-center text-xs text-brand-400 hover:text-brand-300 py-1"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
