'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  Filter,
  ArrowLeft,
  Search,
  X,
  BellOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

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
  total?: number
  hasMore?: boolean
}

type FilterType = 'all' | 'unread' | 'NEW_MESSAGE' | 'LEAD_ASSIGNED' | 'TASK_DUE' | 'TASK_ASSIGNED' | 'CAMPAIGN_COMPLETE' | 'SYSTEM'

const notificationIcons: Record<string, any> = {
  NEW_MESSAGE: MessageCircle,
  LEAD_ASSIGNED: UserPlus,
  TASK_DUE: Clock,
  TASK_ASSIGNED: CheckCircle,
  CAMPAIGN_COMPLETE: CheckCircle,
  SYSTEM: AlertCircle,
}

const notificationColors: Record<string, string> = {
  NEW_MESSAGE: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
  LEAD_ASSIGNED: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  TASK_DUE: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  TASK_ASSIGNED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  CAMPAIGN_COMPLETE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  SYSTEM: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
}

const filterLabels: Record<FilterType, string> = {
  all: 'Todas',
  unread: 'Sin leer',
  NEW_MESSAGE: 'Mensajes',
  LEAD_ASSIGNED: 'Leads asignados',
  TASK_DUE: 'Tareas vencidas',
  TASK_ASSIGNED: 'Tareas asignadas',
  CAMPAIGN_COMPLETE: 'Campañas',
  SYSTEM: 'Sistema',
}

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { label: string; notifications: Notification[] }[] = []
  const today: Notification[] = []
  const yesterday: Notification[] = []
  const thisWeek: Notification[] = []
  const older: Notification[] = []

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt)
    if (isToday(date)) {
      today.push(notification)
    } else if (isYesterday(date)) {
      yesterday.push(notification)
    } else if (isThisWeek(date)) {
      thisWeek.push(notification)
    } else {
      older.push(notification)
    }
  })

  if (today.length > 0) {
    groups.push({ label: 'Hoy', notifications: today })
  }
  if (yesterday.length > 0) {
    groups.push({ label: 'Ayer', notifications: yesterday })
  }
  if (thisWeek.length > 0) {
    groups.push({ label: 'Esta semana', notifications: thisWeek })
  }
  if (older.length > 0) {
    groups.push({ label: 'Anteriores', notifications: older })
  }

  return groups
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch all notifications
  const { data, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', 'all', filter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('limit', '100')
      if (filter === 'unread') {
        params.append('unreadOnly', 'true')
      } else if (filter !== 'all') {
        params.append('type', filter)
      }
      const res = await fetch(`/api/notifications?${params}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    refetchInterval: 30000,
  })

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
      setSelectedIds(new Set())
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

  // Delete notifications mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to delete notifications')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSelectedIds(new Set())
    },
  })

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id])
    }

    // Navigate based on notification type
    if (notification.type === 'NEW_MESSAGE' && notification.leadId) {
      router.push(`/dashboard/inbox?leadId=${notification.leadId}`)
    } else if (notification.leadId) {
      router.push(`/dashboard/leads/${notification.leadId}`)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (filteredNotifications.length === selectedIds.size) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)))
    }
  }

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let result = data?.notifications ?? []

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.lead?.name.toLowerCase().includes(query) ||
          n.lead?.businessName?.toLowerCase().includes(query)
      )
    }

    return result
  }, [data?.notifications, searchQuery])

  // Group notifications by date
  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  )

  const unreadCount = data?.unreadCount ?? 0

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-dark-text">Notificaciones</h1>
              <p className="text-sm text-dark-muted mt-1">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsReadMutation.mutate(Array.from(selectedIds))}
                  disabled={markAsReadMutation.isPending}
                  className="text-brand-400 hover:text-brand-300"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Marcar leído ({selectedIds.size})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(Array.from(selectedIds))}
                  disabled={deleteMutation.isPending}
                  className="text-danger hover:text-danger/80"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar ({selectedIds.size})
                </Button>
              </>
            ) : (
              unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-brand-400 hover:text-brand-300"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4 mr-1" />
                  )}
                  Marcar todo leído
                </Button>
              )
            )}
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar notificaciones..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter dropdown */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['all', 'unread', 'NEW_MESSAGE', 'TASK_DUE'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  filter === filterType
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-dark-card text-dark-muted hover:text-dark-text border border-dark-border hover:border-dark-hover'
                )}
              >
                {filterLabels[filterType]}
              </button>
            ))}
          </div>
        </div>

        {/* Selection bar */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center gap-4 mb-4 px-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border transition-colors flex items-center justify-center',
                  selectedIds.size === filteredNotifications.length
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-dark-border'
                )}
              >
                {selectedIds.size === filteredNotifications.length && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              {selectedIds.size === filteredNotifications.length
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </button>
            <span className="text-xs text-dark-muted">
              {filteredNotifications.length} notificación{filteredNotifications.length !== 1 ? 'es' : ''}
            </span>
          </div>
        )}

        {/* Notifications list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
            <p className="text-dark-muted">Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 bg-dark-card border-dark-border">
            <div className="w-16 h-16 rounded-full bg-dark-hover flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-dark-muted" />
            </div>
            <h3 className="text-lg font-medium text-dark-text mb-2">
              {searchQuery ? 'No se encontraron resultados' : 'No tienes notificaciones'}
            </h3>
            <p className="text-dark-muted text-sm text-center max-w-sm">
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Aquí aparecerán tus notificaciones cuando recibas mensajes, asignaciones de leads y más.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-medium text-dark-muted uppercase tracking-wide mb-3 px-2">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {group.notifications.map((notification) => {
                      const Icon = notificationIcons[notification.type] ?? Bell
                      const colorClass = notificationColors[notification.type] ?? notificationColors.SYSTEM
                      const isSelected = selectedIds.has(notification.id)

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            'group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer',
                            notification.isRead
                              ? 'bg-dark-card border-dark-border hover:border-dark-hover'
                              : 'bg-brand-500/5 border-brand-500/20 hover:border-brand-500/40',
                            isSelected && 'ring-2 ring-brand-500'
                          )}
                        >
                          {/* Selection checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelection(notification.id)
                            }}
                            className={cn(
                              'flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center',
                              isSelected
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-dark-border group-hover:border-dark-muted'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>

                          {/* Icon */}
                          <div
                            className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border',
                              colorClass
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Content */}
                          <div
                            className="flex-1 min-w-0"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4
                                  className={cn(
                                    'font-medium text-sm',
                                    notification.isRead ? 'text-dark-muted' : 'text-dark-text'
                                  )}
                                >
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-dark-muted mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                {notification.lead && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1 text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                                      {notification.lead.businessName || notification.lead.name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <span className="text-xs text-dark-muted whitespace-nowrap">
                                  {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true,
                                    locale: es,
                                  })}
                                </span>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions on hover */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsReadMutation.mutate([notification.id])
                                }}
                                className="p-1.5 rounded-lg bg-dark-hover text-dark-muted hover:text-brand-400 transition-colors"
                                title="Marcar como leído"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteMutation.mutate([notification.id])
                              }}
                              className="p-1.5 rounded-lg bg-dark-hover text-dark-muted hover:text-danger transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
