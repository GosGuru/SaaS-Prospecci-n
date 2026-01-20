'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  UserPlus,
  MessageSquare,
  Mail,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Card, StatCard } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatRelativeTime } from '@/lib/utils'

// Types
interface DashboardMetrics {
  totalLeads: number
  leadGrowth: { value: number; label: string }
  newLeadsToday: number
  newLeadsGrowth: { value: number; label: string }
  contactedToday: number
  wonThisMonth: number
  lostThisMonth: number
  leadsByStage: Array<{ stage: string; count: number; color: string }>
  outreachStats: {
    whatsappSent: number
    whatsappDelivered: number
    whatsappFailed: number
    emailSent: number
    emailDelivered: number
    emailFailed: number
  }
}

interface Activity {
  id: string
  type: string
  title: string
  description: string
  leadName: string
  createdAt: string
  userName?: string
}

interface Task {
  id: string
  title: string
  description: string
  dueDate: string | null
  priority: string
  status: string
  leadName: string | null
  assigneeName: string | null
}


const activityIcons: Record<string, any> = {
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  CALL: Users,
  MEETING: Users,
  STAGE_CHANGE: Target,
  NOTE: Clock,
  TASK_COMPLETED: CheckCircle,
  SYSTEM: Clock,
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-dark-border text-dark-muted',
  MEDIUM: 'bg-amber-500/20 text-amber-400',
  HIGH: 'bg-red-500/20 text-red-400',
  URGENT: 'bg-red-600/30 text-red-300',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true)
        
        // Fetch all data in parallel
        const [metricsRes, activitiesRes, tasksRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/activities'),
          fetch('/api/dashboard/tasks'),
        ])

        if (!metricsRes.ok || !activitiesRes.ok || !tasksRes.ok) {
          throw new Error('Error al cargar datos del dashboard')
        }

        const [metricsData, activitiesData, tasksData] = await Promise.all([
          metricsRes.json(),
          activitiesRes.json(),
          tasksRes.json(),
        ])

        setMetrics(metricsData)
        setActivities(activitiesData)
        setTasks(tasksData)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Error al cargar el dashboard. Por favor, intenta de nuevo.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])


  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-brand-400 hover:text-brand-300"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Dashboard</h1>
          <p className="text-dark-muted mt-1">Resumen de tu actividad comercial</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={metrics.totalLeads}
          change={metrics.leadGrowth}
          trend={metrics.leadGrowth.value >= 0 ? 'up' : 'down'}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Nuevos Hoy"
          value={metrics.newLeadsToday}
          change={metrics.newLeadsGrowth}
          trend={metrics.newLeadsGrowth.value >= 0 ? 'up' : 'down'}
          icon={<UserPlus className="w-5 h-5" />}
        />
        <StatCard
          title="Contactados Hoy"
          value={metrics.contactedToday}
          icon={<MessageSquare className="w-5 h-5" />}
        />
        <StatCard
          title="Ganados / Perdidos"
          value={`${metrics.wonThisMonth} / ${metrics.lostThisMonth}`}
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* Pipeline and Outreach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Pipeline</h2>
          {metrics.leadsByStage.length > 0 ? (
            <div className="space-y-3">
              {metrics.leadsByStage.map((stage) => {
                const maxCount = Math.max(...metrics.leadsByStage.map((s) => s.count))
                const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0

                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-dark-muted">{stage.stage}</span>
                    <div className="flex-1 h-6 rounded-full bg-dark-border overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                    </div>
                    <span className="w-8 text-sm font-medium text-dark-text text-right">
                      {stage.count}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-dark-muted text-center py-8">
              No hay etapas configuradas
            </p>
          )}
        </Card>

        {/* Outreach Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Outreach</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* WhatsApp */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span className="font-medium text-emerald-400">WhatsApp</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Enviados</span>
                  <span className="text-dark-text">{metrics.outreachStats.whatsappSent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Entregados</span>
                  <span className="text-emerald-400">{metrics.outreachStats.whatsappDelivered}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Fallidos</span>
                  <span className="text-red-400">{metrics.outreachStats.whatsappFailed}</span>
                </div>
              </div>
              {metrics.outreachStats.whatsappSent === 0 && (
                <p className="text-xs text-dark-muted mt-2 italic">Pendiente de configuración</p>
              )}
            </div>

            {/* Email */}
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-brand-400" />
                <span className="font-medium text-brand-400">Email</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Enviados</span>
                  <span className="text-dark-text">{metrics.outreachStats.emailSent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Entregados</span>
                  <span className="text-brand-400">{metrics.outreachStats.emailDelivered}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Fallidos</span>
                  <span className="text-red-400">{metrics.outreachStats.emailFailed}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Actividad Reciente</h2>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type] || Clock
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-dark-hover">
                      <Icon className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-text">{activity.title}</p>
                      <p className="text-xs text-dark-muted truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-dark-muted whitespace-nowrap">
                      {formatRelativeTime(new Date(activity.createdAt))}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-dark-muted text-center py-8">
              No hay actividad reciente
            </p>
          )}
        </Card>

        {/* Upcoming Tasks */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Tareas Pendientes</h2>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-dark-hover"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      task.priority === 'HIGH' && 'bg-red-400',
                      task.priority === 'URGENT' && 'bg-red-500',
                      task.priority === 'MEDIUM' && 'bg-amber-400',
                      task.priority === 'LOW' && 'bg-dark-muted'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-text truncate">{task.title}</p>
                    {task.leadName && (
                      <p className="text-xs text-dark-muted">{task.leadName}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      priorityColors[task.priority]
                    )}
                  >
                    {priorityLabels[task.priority] || task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dark-muted text-center py-8">
              No hay tareas pendientes
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
