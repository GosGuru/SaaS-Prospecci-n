'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import {
  Settings,
  MessageCircle,
  Mail,
  Key,
  Globe,
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Trash2,
  Plus,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/types'
import toast from 'react-hot-toast'

type SettingsTab = 'channels' | 'pipeline' | 'api' | 'team'

// Demo pipeline stages
const INITIAL_STAGES: PipelineStage[] = [
  { id: '1', name: 'Nuevo', color: '#6366f1', order: 0, workspaceId: 'demo' },
  { id: '2', name: 'Contactado', color: '#f59e0b', order: 1, workspaceId: 'demo' },
  { id: '3', name: 'Propuesta', color: '#3b82f6', order: 2, workspaceId: 'demo' },
  { id: '4', name: 'Negociación', color: '#8b5cf6', order: 3, workspaceId: 'demo' },
  { id: '5', name: 'Ganado', color: '#10b981', order: 4, workspaceId: 'demo' },
  { id: '6', name: 'Perdido', color: '#ef4444', order: 5, workspaceId: 'demo' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('channels')

  const tabs = [
    { id: 'channels' as const, label: 'Canales', icon: MessageCircle },
    { id: 'pipeline' as const, label: 'Pipeline', icon: GripVertical },
    { id: 'api' as const, label: 'APIs', icon: Key },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Configuración</h1>
        <p className="text-dark-muted mt-1">
          Configurá tus canales de comunicación y personaliza tu workspace
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 p-1 bg-dark-card rounded-lg border border-dark-border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-brand-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'channels' && <ChannelsSettings />}
        {activeTab === 'pipeline' && <PipelineSettings />}
        {activeTab === 'api' && <ApiSettings />}
      </div>
    </div>
  )
}

// Channels settings component
function ChannelsSettings() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  
  const [evolutionConfig, setEvolutionConfig] = useState({
    serverUrl: '',
    apiKey: '',
    instanceName: '',
  })
  const [showEvolutionKey, setShowEvolutionKey] = useState(false)

  // Check Gmail OAuth result from URL params
  useEffect(() => {
    const gmailResult = searchParams.get('gmail')
    if (gmailResult === 'success') {
      toast.success('Gmail conectado correctamente')
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] })
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/settings')
    } else if (gmailResult === 'error') {
      const message = searchParams.get('message') || 'Error desconocido'
      toast.error(`Error al conectar Gmail: ${message}`)
      window.history.replaceState({}, '', '/dashboard/settings')
    }
  }, [searchParams, queryClient])

  // Fetch Gmail connection status
  const { data: gmailStatus, isLoading: isLoadingGmail } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: async () => {
      const response = await fetch('/api/gmail/status')
      if (!response.ok) throw new Error('Error fetching Gmail status')
      return response.json()
    },
  })

  // Fetch Evolution status
  const { data: evolutionStatus, isLoading: isLoadingEvolution } = useQuery({
    queryKey: ['evolution-status'],
    queryFn: async () => {
      const response = await fetch('/api/evolution/status')
      if (!response.ok) throw new Error('Error fetching Evolution status')
      return response.json()
    },
  })

  // Connect Evolution mutation
  const connectEvolutionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/evolution/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: evolutionConfig.serverUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: evolutionConfig.instanceName,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al conectar Evolution API')
      }
      return response.json()
    },
    onSuccess: (data) => {
      if (data.alreadyConnected) {
        // Instance already connected, no QR needed
        toast.success('¡WhatsApp ya está conectado!')
        queryClient.invalidateQueries({ queryKey: ['evolution-status'] })
      } else if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Configuración guardada')
        queryClient.invalidateQueries({ queryKey: ['evolution-status'] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al conectar Evolution API')
    },
  })

  // Connect Gmail mutation - redirects to Google OAuth
  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/gmail/connect')
      if (!response.ok) throw new Error('Error starting Gmail OAuth')
      const data = await response.json()
      return data
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      }
    },
    onError: () => {
      toast.error('Error al iniciar conexión con Gmail')
    },
  })

  // Disconnect Gmail mutation
  const disconnectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/gmail/status', { method: 'DELETE' })
      if (!response.ok) throw new Error('Error disconnecting Gmail')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] })
      toast.success('Gmail desconectado')
    },
    onError: () => {
      toast.error('Error al desconectar Gmail')
    },
  })

  // Disconnect Evolution mutation
  const disconnectEvolutionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/evolution/status', { method: 'DELETE' })
      if (!response.ok) throw new Error('Error disconnecting Evolution')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] })
      toast.success('WhatsApp desconectado')
    },
    onError: () => {
      toast.error('Error al desconectar WhatsApp')
    },
  })

  const isGmailConnected = gmailStatus?.connected === true
  const isEvolutionConnected = evolutionStatus?.connected === true

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* WhatsApp / Evolution API */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-text">WhatsApp</h3>
            <p className="text-sm text-dark-muted">Evolution API v2</p>
          </div>
          {isLoadingEvolution ? (
            <Loader2 className="w-4 h-4 animate-spin text-dark-muted ml-auto" />
          ) : (
            <Badge
              variant={isEvolutionConnected ? 'success' : 'warning'}
              className="ml-auto"
            >
              {isEvolutionConnected ? 'Conectado' : 'No conectado'}
            </Badge>
          )}
        </div>

        {isEvolutionConnected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">WhatsApp conectado correctamente</span>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-dark-muted">
                  Instancia: <span className="text-dark-text">{evolutionStatus.instance}</span>
                </p>
                <p className="text-sm text-dark-muted">
                  Servidor: <span className="text-dark-text">{evolutionStatus.baseUrl}</span>
                </p>
                <p className="text-sm text-dark-muted">
                  Estado: <span className="text-emerald-400 capitalize">{evolutionStatus.state}</span>
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              className="w-full"
              onClick={() => disconnectEvolutionMutation.mutate()}
              isLoading={disconnectEvolutionMutation.isPending}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Desconectar WhatsApp
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-2">
                URL del servidor Evolution
              </label>
              <Input
                placeholder="https://evolution.tuserver.com"
                value={evolutionConfig.serverUrl}
                onChange={(e) =>
                  setEvolutionConfig({ ...evolutionConfig, serverUrl: e.target.value })
                }
                icon={<Globe className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-2">
                API Key
              </label>
              <div className="relative">
                <Input
                  type={showEvolutionKey ? 'text' : 'password'}
                  placeholder="Tu API key de Evolution"
                  value={evolutionConfig.apiKey}
                  onChange={(e) =>
                    setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })
                  }
                  icon={<Key className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionKey(!showEvolutionKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                >
                  {showEvolutionKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-2">
                Nombre de instancia
              </label>
              <Input
                placeholder="mi-instancia"
                value={evolutionConfig.instanceName}
                onChange={(e) =>
                  setEvolutionConfig({ ...evolutionConfig, instanceName: e.target.value })
                }
                icon={<Smartphone className="w-4 h-4" />}
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => connectEvolutionMutation.mutate()}
              isLoading={connectEvolutionMutation.isPending}
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              Conectar WhatsApp
            </Button>

            <div className="p-3 rounded-lg bg-dark-hover">
              <p className="text-xs text-dark-muted">
                <strong>¿No tenés Evolution API?</strong>{' '}
                <a
                  href="https://doc.evolution-api.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:underline"
                >
                  Seguí esta guía para instalarlo
                </a>
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Gmail */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-text">Gmail</h3>
            <p className="text-sm text-dark-muted">Google OAuth 2.0</p>
          </div>
          {isLoadingGmail ? (
            <Loader2 className="w-4 h-4 animate-spin text-dark-muted ml-auto" />
          ) : (
            <Badge
              variant={isGmailConnected ? 'success' : 'warning'}
              className="ml-auto"
            >
              {isGmailConnected ? 'Conectado' : 'No conectado'}
            </Badge>
          )}
        </div>

        {isGmailConnected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Gmail conectado correctamente</span>
              </div>
              <p className="text-sm text-dark-muted mt-2">
                Cuenta: <span className="text-dark-text">{gmailStatus?.email || 'Conectado'}</span>
              </p>
              <p className="text-sm text-dark-muted mt-1">
                Podés enviar emails directamente desde el CRM
              </p>
            </div>

            <Button
              variant="danger"
              className="w-full"
              onClick={() => disconnectGmailMutation.mutate()}
              isLoading={disconnectGmailMutation.isPending}
            >
              Desconectar Gmail
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-dark-muted">
              Conectá tu cuenta de Gmail para enviar emails directamente desde el CRM.
              Necesitás crear credenciales OAuth en Google Cloud Console.
            </p>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => connectGmailMutation.mutate()}
              isLoading={connectGmailMutation.isPending}
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Conectar con Google
            </Button>

            <div className="p-3 rounded-lg bg-dark-hover">
              <p className="text-xs text-dark-muted">
                <strong>¿Cómo configuro Gmail API?</strong>{' '}
                <a
                  href="https://developers.google.com/gmail/api/quickstart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:underline"
                >
                  Ver documentación de Google
                </a>
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// Pipeline settings component
function PipelineSettings() {
  const queryClient = useQueryClient()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366f1')
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch pipeline stages from API
  const { data: pipelineData, isLoading: isLoadingPipeline } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const response = await fetch('/api/workspace/pipeline')
      if (!response.ok) throw new Error('Error fetching pipeline stages')
      return response.json() as Promise<{ workspaceId: string; stages: PipelineStage[] }>
    },
  })

  // Initialize stages from API data
  useEffect(() => {
    if (pipelineData?.stages && pipelineData.stages.length > 0) {
      setStages(pipelineData.stages)
    } else if (pipelineData && pipelineData.stages.length === 0) {
      // If no stages exist, use initial demo stages
      setStages(INITIAL_STAGES)
      setHasChanges(true) // Mark as having changes to prompt save
    }
  }, [pipelineData])

  // Save pipeline stages mutation
  const savePipelineMutation = useMutation({
    mutationFn: async (stagesToSave: PipelineStage[]) => {
      const response = await fetch('/api/workspace/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stages: stagesToSave.map((s, index) => ({
            id: s.id.startsWith('new-') ? undefined : s.id,
            name: s.name,
            color: s.color,
            order: index,
          })),
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error saving pipeline')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
      setStages(data.stages)
      setHasChanges(false)
      toast.success('Pipeline guardado')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al guardar pipeline')
    },
  })

  const colors = [
    '#6366f1', // Indigo
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#10b981', // Emerald
    '#ef4444', // Red
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ]

  const addStage = () => {
    if (!newStageName.trim()) return

    const newStage: PipelineStage = {
      id: `new-${Date.now()}`,
      name: newStageName,
      color: newStageColor,
      order: stages.length,
      workspaceId: pipelineData?.workspaceId || 'pending',
    }

    setStages([...stages, newStage])
    setNewStageName('')
    setHasChanges(true)
    toast.success('Etapa agregada (guardá para confirmar)')
  }

  const deleteStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id))
    setHasChanges(true)
    toast.success('Etapa eliminada (guardá para confirmar)')
  }

  const updateStage = (id: string, updates: Partial<PipelineStage>) => {
    setStages(stages.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    setHasChanges(true)
  }

  const handleSave = () => {
    savePipelineMutation.mutate(stages)
  }

  if (isLoadingPipeline) {
    return (
      <div className="max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            <span className="ml-2 text-dark-muted">Cargando pipeline...</span>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Card className="p-6">
        <h3 className="font-semibold text-dark-text mb-6">Etapas del Pipeline</h3>

        {/* Stages list */}
        <div className="space-y-3 mb-6">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-dark-hover group"
            >
              <GripVertical className="w-4 h-4 text-dark-muted cursor-grab" />

              {/* Color picker */}
              <div className="relative">
                <button
                  className="w-6 h-6 rounded-full border-2 border-dark-border"
                  style={{ backgroundColor: stage.color }}
                />
              </div>

              {/* Name */}
              <input
                value={stage.name}
                onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-dark-text focus:outline-none"
              />

              {/* Position */}
              <span className="text-sm text-dark-muted">#{index + 1}</span>

              {/* Delete */}
              <button
                onClick={() => deleteStage(stage.id)}
                className="p-1 rounded hover:bg-danger/10 text-dark-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Add new stage */}
        <div className="p-4 rounded-lg border border-dashed border-dark-border">
          <p className="text-sm font-medium text-dark-muted mb-3">Agregar nueva etapa</p>

          <div className="flex gap-3">
            {/* Color selector */}
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewStageColor(color)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-transform',
                    newStageColor === color && 'ring-2 ring-white ring-offset-2 ring-offset-dark-card scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-3">
            <Input
              placeholder="Nombre de la etapa"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={addStage}
              disabled={!newStageName.trim()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Agregar
            </Button>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-6 pt-6 border-t border-dark-border">
          <Button
            variant="primary"
            className="w-full"
            leftIcon={savePipelineMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={handleSave}
            disabled={!hasChanges || savePipelineMutation.isPending}
          >
            {savePipelineMutation.isPending ? 'Guardando...' : hasChanges ? 'Guardar cambios' : 'Sin cambios'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// API settings component
function ApiSettings() {
  const [showKeys, setShowKeys] = useState({
    google: false,
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  return (
    <div className="space-y-6">
      {/* Google Places API */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-text">Google Places API</h3>
            <p className="text-sm text-dark-muted">Para buscar negocios en Google Maps</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-2">
              API Key
            </label>
            <div className="relative">
              <Input
                type={showKeys.google ? 'text' : 'password'}
                placeholder="AIzaSy..."
                icon={<Key className="w-4 h-4" />}
              />
              <button
                type="button"
                onClick={() => setShowKeys({ ...showKeys, google: !showKeys.google })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
              >
                {showKeys.google ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-dark-hover">
            <p className="text-xs text-dark-muted">
              <strong>¿Cómo obtener una API Key?</strong>{' '}
              <a
                href="https://developers.google.com/maps/documentation/places/web-service/get-api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:underline inline-flex items-center gap-1"
              >
                Ver documentación <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
            Guardar API Key
          </Button>
        </div>
      </Card>

      {/* Webhook URL */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-text">Webhook URL</h3>
            <p className="text-sm text-dark-muted">Para recibir mensajes de WhatsApp</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-hover">
            <code className="flex-1 text-sm text-dark-text font-mono truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/evolution/webhook` : '/api/evolution/webhook'}
            </code>
            <button
              onClick={() =>
                copyToClipboard(`${window.location.origin}/api/evolution/webhook`)
              }
              className="p-2 rounded-lg hover:bg-dark-border text-dark-muted hover:text-dark-text"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch('/api/evolution/webhook/configure')
                  const data = await res.json()
                  if (data.configured && data.isCorrect) {
                    toast.success('Webhook configurado correctamente')
                  } else if (data.configured && !data.isCorrect) {
                    toast.error(`Webhook incorrecto. URL actual: ${data.currentUrl || 'ninguna'}`)
                  } else {
                    toast.error('WhatsApp no está conectado')
                  }
                } catch (e) {
                  toast.error('Error verificando webhook')
                }
              }}
            >
              Verificar Webhook
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch('/api/evolution/webhook/configure', { method: 'POST' })
                  const data = await res.json()
                  if (data.success) {
                    toast.success('Webhook reconfigurado correctamente')
                  } else {
                    toast.error(data.error || 'Error configurando webhook')
                  }
                } catch (e) {
                  toast.error('Error configurando webhook')
                }
              }}
            >
              Reconfigurar Webhook
            </Button>
          </div>

          <p className="text-xs text-dark-muted">
            Esta URL se configura automáticamente al conectar Evolution API. Si no recibes mensajes entrantes,
            usa el botón &quot;Reconfigurar Webhook&quot; para forzar la configuración.
          </p>
        </div>
      </Card>

      {/* Environment info */}
      <Card className="p-6">
        <h3 className="font-semibold text-dark-text mb-4">Variables de Entorno</h3>

        <div className="space-y-3 font-mono text-sm">
          <div className="p-2 rounded bg-dark-hover">
            <span className="text-emerald-400">GOOGLE_PLACES_API_KEY</span>=
            <span className="text-dark-muted">tu_api_key</span>
          </div>
          <div className="p-2 rounded bg-dark-hover">
            <span className="text-emerald-400">EVOLUTION_API_URL</span>=
            <span className="text-dark-muted">https://evolution.ejemplo.com</span>
          </div>
          <div className="p-2 rounded bg-dark-hover">
            <span className="text-emerald-400">EVOLUTION_API_KEY</span>=
            <span className="text-dark-muted">tu_api_key</span>
          </div>
          <div className="p-2 rounded bg-dark-hover">
            <span className="text-emerald-400">GOOGLE_CLIENT_ID</span>=
            <span className="text-dark-muted">tu_client_id.apps.googleusercontent.com</span>
          </div>
          <div className="p-2 rounded bg-dark-hover">
            <span className="text-emerald-400">GOOGLE_CLIENT_SECRET</span>=
            <span className="text-dark-muted">tu_client_secret</span>
          </div>
        </div>

        <p className="text-xs text-dark-muted mt-4">
          Estas variables deben configurarse en tu archivo .env.local o en Vercel.
        </p>
      </Card>
    </div>
  )
}
