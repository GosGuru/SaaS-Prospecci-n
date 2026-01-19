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

// Demo data
const DEMO_METRICS = {
  totalLeads: 147,
  newLeadsToday: 12,
  contactedToday: 8,
  wonThisMonth: 23,
  lostThisMonth: 7,
  leadsByStage: [
    { stage: 'Nuevo', count: 34, color: '#6366f1' },
    { stage: 'Contactado', count: 28, color: '#0ea5e9' },
    { stage: 'Calificado', count: 19, color: '#8b5cf6' },
    { stage: 'Reunión', count: 15, color: '#f59e0b' },
    { stage: 'Propuesta', count: 11, color: '#ec4899' },
    { stage: 'Ganado', count: 23, color: '#10b981' },
    { stage: 'Perdido', count: 17, color: '#ef4444' },
  ],
  outreachStats: {
    whatsappSent: 156,
    whatsappDelivered: 148,
    whatsappFailed: 8,
    emailSent: 89,
    emailDelivered: 85,
    emailFailed: 4,
  },
}

const DEMO_ACTIVITIES = [
  {
    id: '1',
    type: 'WHATSAPP',
    title: 'WhatsApp enviado',
    description: 'Mensaje de presentación a Restaurante El Buen Sabor',
    leadName: 'Restaurante El Buen Sabor',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '2',
    type: 'STAGE_CHANGE',
    title: 'Cambio de etapa',
    description: 'Peluquería Estilo movido a Propuesta',
    leadName: 'Peluquería Estilo & Belleza',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: '3',
    type: 'EMAIL',
    title: 'Email enviado',
    description: 'Propuesta comercial enviada a Gimnasio Power',
    leadName: 'Gimnasio Power Fitness',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: '4',
    type: 'NOTE',
    title: 'Nota agregada',
    description: 'Cliente interesado en landing page + SEO',
    leadName: 'Clínica Dental Sonrisa',
    createdAt: new Date(Date.now() - 1000 * 60 * 180),
  },
]

const DEMO_TASKS = [
  {
    id: '1',
    title: 'Llamar a Restaurante El Buen Sabor',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
    priority: 'HIGH',
    leadName: 'Restaurante El Buen Sabor',
  },
  {
    id: '2',
    title: 'Enviar propuesta a Peluquería Estilo',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    priority: 'MEDIUM',
    leadName: 'Peluquería Estilo & Belleza',
  },
  {
    id: '3',
    title: 'Seguimiento WhatsApp - Gimnasio Power',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48),
    priority: 'LOW',
    leadName: 'Gimnasio Power Fitness',
  },
]

const activityIcons: Record<string, any> = {
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  STAGE_CHANGE: Target,
  NOTE: Clock,
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-dark-border text-dark-muted',
  MEDIUM: 'bg-amber-500/20 text-amber-400',
  HIGH: 'bg-red-500/20 text-red-400',
  URGENT: 'bg-red-600/30 text-red-300',
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState(DEMO_METRICS)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
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
        <Badge variant="brand" dot>
          Modo Demo Activo
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={metrics.totalLeads}
          change={{ value: 12, label: 'vs mes anterior' }}
          trend="up"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Nuevos Hoy"
          value={metrics.newLeadsToday}
          change={{ value: 5, label: 'vs ayer' }}
          trend="up"
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
          <div className="space-y-3">
            {metrics.leadsByStage.map((stage) => {
              const maxCount = Math.max(...metrics.leadsByStage.map((s) => s.count))
              const percentage = (stage.count / maxCount) * 100

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
          <div className="space-y-4">
            {DEMO_ACTIVITIES.map((activity) => {
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
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Tareas Pendientes</h2>
          <div className="space-y-3">
            {DEMO_TASKS.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-dark-hover"
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    task.priority === 'HIGH' && 'bg-red-400',
                    task.priority === 'MEDIUM' && 'bg-amber-400',
                    task.priority === 'LOW' && 'bg-dark-muted'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-text truncate">{task.title}</p>
                  <p className="text-xs text-dark-muted">{task.leadName}</p>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    priorityColors[task.priority]
                  )}
                >
                  {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                </span>
              </div>
            ))}
          </div>
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
