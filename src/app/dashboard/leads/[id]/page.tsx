'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Calendar,
  Clock,
  MessageCircle,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
  ExternalLink,
  Image,
  Paperclip,
  ChevronDown,
  Plus,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, GlassCard } from '@/components/ui/card'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { WebProbabilityBadge, ProbabilityBar } from '@/components/ui/web-probability'
import { LeadDetailSkeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import type { Lead, Activity, PipelineStage } from '@/types'
import toast from 'react-hot-toast'

// Demo pipeline stages
const DEMO_STAGES: PipelineStage[] = [
  { id: '1', name: 'Nuevo', color: '#6366f1', order: 0, workspaceId: 'demo' },
  { id: '2', name: 'Contactado', color: '#f59e0b', order: 1, workspaceId: 'demo' },
  { id: '3', name: 'Propuesta', color: '#3b82f6', order: 2, workspaceId: 'demo' },
  { id: '4', name: 'Negociación', color: '#8b5cf6', order: 3, workspaceId: 'demo' },
  { id: '5', name: 'Ganado', color: '#10b981', order: 4, workspaceId: 'demo' },
  { id: '6', name: 'Perdido', color: '#ef4444', order: 5, workspaceId: 'demo' },
]

// Demo lead
const DEMO_LEAD: Lead = {
  id: '1',
  name: 'La Parrilla de Juan',
  phone: '+54 11 4567-8901',
  email: 'contacto@laparrilladejuan.com',
  address: 'Av. Corrientes 1234, Buenos Aires',
  category: 'Restaurante',
  source: 'google_places',
  status: 'active',
  stageId: '2',
  hasWebsite: false,
  webProbability: 78,
  rating: 4.5,
  reviewCount: 234,
  notes: 'Restaurante muy popular, potencial cliente para sitio web. Tienen muy buenas reseñas y una clientela fiel.',
  workspaceId: 'demo',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-18'),
}

// Demo activities
const DEMO_ACTIVITIES: Activity[] = [
  {
    id: '1',
    type: 'stage_change',
    description: 'Etapa cambiada de "Nuevo" a "Contactado"',
    leadId: '1',
    userId: 'demo',
    createdAt: new Date('2024-01-18T14:30:00'),
  },
  {
    id: '2',
    type: 'whatsapp_sent',
    description: 'Mensaje de WhatsApp enviado',
    metadata: { content: '¡Hola! Somos una agencia de desarrollo web...' },
    leadId: '1',
    userId: 'demo',
    createdAt: new Date('2024-01-17T10:15:00'),
  },
  {
    id: '3',
    type: 'note',
    description: 'Nota agregada: "Cliente interesado, programar llamada"',
    leadId: '1',
    userId: 'demo',
    createdAt: new Date('2024-01-16T16:45:00'),
  },
  {
    id: '4',
    type: 'created',
    description: 'Lead creado desde Google Places',
    leadId: '1',
    userId: 'demo',
    createdAt: new Date('2024-01-15T09:00:00'),
  },
]

type MessageChannel = 'whatsapp' | 'email'

interface LeadWithDetails extends Lead {
  activities?: Activity[]
  stages?: PipelineStage[]
  opportunityType?: 'new_website' | 'redesign' | 'low_priority'
  redesignPotential?: number
  redesignReason?: string
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const leadId = params.id as string

  const [activeTab, setActiveTab] = useState<'timeline' | 'compose'>('timeline')
  const [messageChannel, setMessageChannel] = useState<MessageChannel>('whatsapp')
  const [messageContent, setMessageContent] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [showStageSelector, setShowStageSelector] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')

  // Fetch lead with activities and stages
  const { data: leadData, isLoading: isLoadingLead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${leadId}`)
      if (!response.ok) throw new Error('Error fetching lead')
      return response.json() as Promise<LeadWithDetails>
    },
  })

  const { data: enrichmentData } = useQuery({
    queryKey: ['enrichment', leadId],
    queryFn: async () => {
      const response = await fetch(`/api/enrichment?leadId=${leadId}`)
      if (!response.ok) throw new Error('Error fetching enrichment')
      return response.json() as Promise<{ job: { status: string; result?: { emails?: string[] } } | null }>
    },
  })

  const lead = leadData || DEMO_LEAD
  const activities = leadData?.activities || DEMO_ACTIVITIES
  const stages = leadData?.stages || DEMO_STAGES

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (!response.ok) throw new Error('Error updating stage')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      toast.success('Etapa actualizada')
      setShowStageSelector(false)
    },
    onError: () => {
      toast.error('Error al actualizar etapa')
    },
  })

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!response.ok) throw new Error('Error updating notes')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      toast.success('Notas actualizadas')
      setShowNotesModal(false)
    },
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ channel, content, subject }: { channel: MessageChannel; content: string; subject?: string }) => {
      if (channel === 'email') {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            leadId,
            subject, 
            message: content,
          }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al enviar email')
        }
        return response.json()
      } else {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: lead.phone, message: content, leadId }),
        })
        if (!response.ok) throw new Error('Error al enviar WhatsApp')
        return response.json()
      }
    },
    onSuccess: () => {
      toast.success(`${messageChannel === 'whatsapp' ? 'WhatsApp' : 'Email'} enviado`)
      setMessageContent('')
      setEmailSubject('')
      setActiveTab('timeline')
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    },
    onError: () => {
      toast.error('Error al enviar mensaje')
    },
  })

  const runEnrichmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al ejecutar enriquecimiento')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['enrichment', leadId] })
      toast.success('Enriquecimiento ejecutado')
    },
    onError: () => {
      toast.error('No se pudo enriquecer el email')
    },
  })

  // Delete lead mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error deleting lead')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Lead eliminado')
      router.push('/dashboard/leads')
    },
    onError: () => {
      toast.error('Error al eliminar lead')
    },
  })

  const currentStage = stages.find((s) => s.id === lead.stageId)

  const handleSendMessage = () => {
    if (!messageContent.trim()) {
      toast.error('Escribí un mensaje')
      return
    }

    if (messageChannel === 'email' && !emailSubject.trim()) {
      toast.error('Escribí un asunto')
      return
    }

    sendMessageMutation.mutate({
      channel: messageChannel,
      content: messageContent,
      subject: emailSubject,
    })
  }

  const openNotesModal = () => {
    setEditedNotes(lead.notes || '')
    setShowNotesModal(true)
  }

  if (isLoadingLead) {
    return <LeadDetailSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark-text">{lead.name}</h1>
          <p className="text-dark-muted flex items-center gap-2 mt-1">
            <MapPin className="w-4 h-4" />
            {lead.address}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={openNotesModal}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Lead info */}
        <div className="space-y-6">
          {/* Stage selector */}
          <Card className="p-4 overflow-visible relative z-20">
            <h3 className="text-sm font-medium text-dark-muted mb-3">Etapa del Pipeline</h3>
            <div className="relative">
              <button
                onClick={() => setShowStageSelector(!showStageSelector)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-dark-border hover:border-brand-500 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentStage?.color }}
                  />
                  <span className="font-medium text-dark-text">{currentStage?.name}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-dark-muted" />
              </button>

              <AnimatePresence>
                {showStageSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50 overflow-hidden"
                  >
                    {stages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => updateStageMutation.mutate(stage.id)}
                        className={cn(
                          'w-full flex items-center gap-2 p-3 hover:bg-dark-hover transition-colors',
                          stage.id === lead.stageId && 'bg-dark-hover'
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-dark-text">{stage.name}</span>
                        {stage.id === lead.stageId && (
                          <CheckCircle className="w-4 h-4 text-brand-400 ml-auto" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Web probability & Opportunity */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-dark-muted mb-3">Oportunidad</h3>
            
            {/* Opportunity Type Badge */}
            <div className="mb-4">
              {leadData?.opportunityType === 'new_website' ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p className="font-medium text-emerald-400">Nueva Web</p>
                    <p className="text-xs text-dark-muted">No tiene presencia digital</p>
                  </div>
                </div>
              ) : leadData?.opportunityType === 'redesign' ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-lg">🔄</span>
                  <div>
                    <p className="font-medium text-amber-400">Potencial Rediseño</p>
                    <p className="text-xs text-dark-muted">{leadData?.redesignReason || 'Podría beneficiarse de una web moderna'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-hover border border-dark-border">
                  <span className="text-lg">⏸️</span>
                  <div>
                    <p className="font-medium text-dark-muted">Baja Prioridad</p>
                    <p className="text-xs text-dark-muted">{leadData?.redesignReason || 'Probablemente tiene equipo interno'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Score Display */}
            <div className="flex items-center gap-4">
              <WebProbabilityBadge score={lead.webProbability || 0} size="lg" />
              <div className="flex-1">
                <ProbabilityBar score={lead.webProbability || 0} />
                <p className="text-xs text-dark-muted mt-2">
                  {!leadData?.hasWebsite 
                    ? (lead.webProbability && lead.webProbability >= 70
                      ? '🔥 Alta probabilidad de conversión'
                      : lead.webProbability && lead.webProbability >= 40
                      ? '✨ Oportunidad moderada'
                      : '📋 Prioridad baja')
                    : `Potencial rediseño: ${leadData?.redesignPotential || 0}%`
                  }
                </p>
              </div>
            </div>
            
            {/* Redesign potential bar for websites */}
            {leadData?.hasWebsite && (leadData?.redesignPotential ?? 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-dark-border">
                <div className="flex justify-between text-xs text-dark-muted mb-2">
                  <span>Potencial de rediseño</span>
                  <span className={(leadData.redesignPotential ?? 0) >= 70 ? 'text-amber-400' : (leadData.redesignPotential ?? 0) >= 50 ? 'text-yellow-400' : 'text-dark-muted'}>
                    {leadData.redesignPotential ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-dark-hover rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (leadData.redesignPotential ?? 0) >= 70 ? 'bg-amber-500' : 
                      (leadData.redesignPotential ?? 0) >= 50 ? 'bg-yellow-500' : 
                      'bg-gray-500'
                    }`}
                    style={{ width: `${leadData.redesignPotential ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Contact info */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-dark-muted mb-3">Información de Contacto</h3>
            <div className="space-y-3">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors"
                >
                  <Phone className="w-5 h-5 text-brand-400" />
                  <span className="text-dark-text">{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors"
                >
                  <Mail className="w-5 h-5 text-brand-400" />
                  <span className="text-dark-text">{lead.email}</span>
                </a>
              )}
              {!lead.email && (
                <div className="p-2 rounded-lg bg-dark-hover/50 space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => runEnrichmentMutation.mutate()}
                    disabled={!lead.website || runEnrichmentMutation.isPending}
                    leftIcon={
                      runEnrichmentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : undefined
                    }
                  >
                    Buscar email
                  </Button>
                  <p className="text-xs text-dark-muted">
                    {!lead.website
                      ? 'Agregá un sitio web para ejecutar el scraping.'
                      : enrichmentData?.job?.status === 'FAILED'
                      ? 'No se encontró email en el sitio web.'
                      : enrichmentData?.job?.status === 'RUNNING'
                      ? 'Enriqueciendo en curso...'
                      : 'Usa scraping del sitio web.'}
                  </p>
                </div>
              )}
              {lead.website ? (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors"
                >
                  <Globe className="w-5 h-5 text-brand-400" />
                  <span className="text-dark-text truncate">{lead.website}</span>
                  <ExternalLink className="w-4 h-4 text-dark-muted ml-auto" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-500/10">
                  <XCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">No tiene sitio web</span>
                </div>
              )}
            </div>
          </Card>

          {/* Details */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-dark-muted mb-3">Detalles</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-muted">Categoría</span>
                <Badge variant="neutral">{lead.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Rating</span>
                <span className="flex items-center gap-1 text-dark-text">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  {lead.rating} ({lead.reviewCount})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Origen</span>
                <span className="text-dark-text capitalize">{lead.source?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Agregado</span>
                <span className="text-dark-text">{formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-dark-muted">Notas</h3>
              <button
                onClick={openNotesModal}
                className="text-brand-400 hover:text-brand-300 text-sm"
              >
                Editar
              </button>
            </div>
            <p className="text-dark-text text-sm">
              {lead.notes || 'Sin notas'}
            </p>
          </Card>
        </div>

        {/* Right column - Timeline & Compose */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab navigation */}
          <div className="flex gap-2 p-1 bg-dark-card rounded-lg border border-dark-border">
            <button
              onClick={() => setActiveTab('timeline')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                activeTab === 'timeline'
                  ? 'bg-brand-500 text-white'
                  : 'text-dark-muted hover:text-dark-text'
              )}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                activeTab === 'compose'
                  ? 'bg-brand-500 text-white'
                  : 'text-dark-muted hover:text-dark-text'
              )}
            >
              Enviar Mensaje
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'timeline' ? (
            <TimelineView activities={activities} />
          ) : (
            <ComposeView
              lead={lead}
              channel={messageChannel}
              onChannelChange={setMessageChannel}
              content={messageContent}
              onContentChange={setMessageContent}
              subject={emailSubject}
              onSubjectChange={setEmailSubject}
              onSend={handleSendMessage}
              isSending={sendMessageMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar Lead"
        message={`¿Estás seguro de que querés eliminar "${lead.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />

      {/* Notes modal */}
      <Modal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title="Editar Notas"
      >
        <div className="space-y-4">
          <textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            className="w-full h-40 p-3 rounded-lg bg-dark-bg border border-dark-border text-dark-text resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            placeholder="Escribí notas sobre este lead..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNotesModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => {
              toast.success('Notas guardadas')
              setShowNotesModal(false)
            }}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Timeline view component
function TimelineView({ activities }: { activities: Activity[] }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stage_change':
        return <Tag className="w-4 h-4" />
      case 'whatsapp_sent':
      case 'whatsapp_received':
        return <MessageCircle className="w-4 h-4" />
      case 'email_sent':
      case 'email_received':
        return <Mail className="w-4 h-4" />
      case 'note':
        return <Edit2 className="w-4 h-4" />
      case 'call':
        return <Phone className="w-4 h-4" />
      case 'created':
        return <Plus className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'stage_change':
        return 'bg-purple-500'
      case 'whatsapp_sent':
      case 'whatsapp_received':
        return 'bg-green-500'
      case 'email_sent':
      case 'email_received':
        return 'bg-blue-500'
      case 'note':
        return 'bg-yellow-500'
      case 'created':
        return 'bg-brand-500'
      default:
        return 'bg-dark-muted'
    }
  }

  return (
    <Card className="p-6">
      <h3 className="font-medium text-dark-text mb-6">Historial de Actividad</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-dark-border" />

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-12"
            >
              {/* Icon */}
              <div
                className={cn(
                  'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
                  getActivityColor(activity.type)
                )}
              >
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="bg-dark-hover rounded-lg p-4">
                <p className="text-dark-text">{activity.description}</p>
                {activity.metadata?.content && (
                  <p className="text-sm text-dark-muted mt-2 italic">
                    "{activity.metadata.content}"
                  </p>
                )}
                <p className="text-xs text-dark-muted mt-2">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-dark-muted mx-auto mb-4" />
          <p className="text-dark-muted">No hay actividad registrada</p>
        </div>
      )}
    </Card>
  )
}

// Compose view component
interface ComposeViewProps {
  lead: Lead
  channel: MessageChannel
  onChannelChange: (channel: MessageChannel) => void
  content: string
  onContentChange: (content: string) => void
  subject: string
  onSubjectChange: (subject: string) => void
  onSend: () => void
  isSending: boolean
}

function ComposeView({
  lead,
  channel,
  onChannelChange,
  content,
  onContentChange,
  subject,
  onSubjectChange,
  onSend,
  isSending,
}: ComposeViewProps) {
  const hasPhone = !!lead.phone
  const hasEmail = !!lead.email

  // Template messages
  const templates = [
    {
      name: 'Presentación',
      content: `¡Hola! Soy Máximo. Vi ${lead.businessName || lead.name} y me encantaría ayudarlos a mejorar su presencia digital. ¿Tenés 5 minutos para charlar?`,
    },
    {
      name: 'Seguimiento',
      content: `¡Hola de nuevo! Quería saber si tuvieron tiempo de pensar sobre nuestra propuesta para crear el sitio web de ${lead.name}. ¿Tienen alguna consulta?`,
    },
    {
      name: 'Sin web',
      content: `¡Hola! Noté que ${lead.name} todavía no tiene sitio web. Hoy en día, tener presencia online es fundamental. ¿Te gustaría que conversemos sobre cómo podemos ayudarlos?`,
    },
  ]

  return (
    <Card className="p-6">
      <h3 className="font-medium text-dark-text mb-6">Enviar Mensaje</h3>

      {/* Channel selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => onChannelChange('whatsapp')}
          disabled={!hasPhone}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors',
            channel === 'whatsapp'
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-dark-border text-dark-muted hover:text-dark-text',
            !hasPhone && 'opacity-50 cursor-not-allowed'
          )}
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp
          {!hasPhone && <span className="text-xs">(Sin teléfono)</span>}
        </button>
        <button
          onClick={() => onChannelChange('email')}
          disabled={!hasEmail}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors',
            channel === 'email'
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-dark-border text-dark-muted hover:text-dark-text',
            !hasEmail && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Mail className="w-5 h-5" />
          Email
          {!hasEmail && <span className="text-xs">(Sin email)</span>}
        </button>
      </div>

      {/* Recipient */}
      <div className="mb-4 p-3 rounded-lg bg-dark-hover">
        <span className="text-sm text-dark-muted">Para: </span>
        <span className="text-dark-text">
          {channel === 'whatsapp' ? lead.phone : lead.email}
        </span>
      </div>

      {/* Email subject */}
      {channel === 'email' && (
        <div className="mb-4">
          <Input
            placeholder="Asunto del email"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
          />
        </div>
      )}

      {/* Templates */}
      <div className="mb-4">
        <p className="text-sm text-dark-muted mb-2">Plantillas rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.name}
              onClick={() => onContentChange(template.content)}
              className="px-3 py-1.5 rounded-full bg-dark-hover text-dark-muted hover:text-dark-text text-sm transition-colors"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Message input */}
      <div className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={`Escribí tu mensaje${channel === 'whatsapp' ? ' de WhatsApp' : ''}...`}
          className="w-full h-40 p-4 rounded-lg bg-dark-bg border border-dark-border text-dark-text resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text transition-colors">
              <Image className="w-5 h-5" />
            </button>
          </div>

          <Button
            variant="primary"
            onClick={onSend}
            isLoading={isSending}
            disabled={!content.trim() || (!hasPhone && channel === 'whatsapp') || (!hasEmail && channel === 'email')}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Enviar {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
