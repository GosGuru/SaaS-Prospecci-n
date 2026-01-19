'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
  ChevronDown,
  Phone,
  Mail,
  Globe,
  Star,
  MoreVertical,
  MessageCircle,
  Calendar,
  Tag,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { WebProbabilityBadge } from '@/components/ui/web-probability'
import { LeadCardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import type { Lead, PipelineStage } from '@/types'

// View modes
type ViewMode = 'table' | 'kanban'

// Demo pipeline stages
const DEMO_STAGES: PipelineStage[] = [
  { id: '1', name: 'Nuevo', color: '#6366f1', order: 0, workspaceId: 'demo' },
  { id: '2', name: 'Contactado', color: '#f59e0b', order: 1, workspaceId: 'demo' },
  { id: '3', name: 'Propuesta', color: '#3b82f6', order: 2, workspaceId: 'demo' },
  { id: '4', name: 'Negociación', color: '#8b5cf6', order: 3, workspaceId: 'demo' },
  { id: '5', name: 'Ganado', color: '#10b981', order: 4, workspaceId: 'demo' },
  { id: '6', name: 'Perdido', color: '#ef4444', order: 5, workspaceId: 'demo' },
]

// Demo leads
const DEMO_LEADS: Lead[] = [
  {
    id: '1',
    name: 'La Parrilla de Juan',
    phone: '+54 11 4567-8901',
    email: 'contacto@laparrilladejuan.com',
    address: 'Av. Corrientes 1234, Buenos Aires',
    category: 'Restaurante',
    source: 'google_places',
    status: 'active',
    stageId: '1',
    hasWebsite: false,
    webProbability: 78,
    rating: 4.5,
    reviewCount: 234,
    notes: 'Restaurante muy popular, potencial cliente para sitio web.',
    workspaceId: 'demo',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Peluquería Style',
    phone: '+54 11 5555-1234',
    email: undefined,
    address: 'Av. Santa Fe 4567, Buenos Aires',
    category: 'Peluquería',
    source: 'google_places',
    status: 'active',
    stageId: '2',
    hasWebsite: true,
    website: 'https://peluqueriastyle.com.ar',
    webProbability: 35,
    rating: 4.2,
    reviewCount: 89,
    notes: 'Ya tiene web pero podría mejorarla.',
    workspaceId: 'demo',
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: '3',
    name: 'Gimnasio Power Fit',
    phone: '+54 11 4444-5678',
    email: 'info@powerfit.com',
    address: 'Calle Rivadavia 789, Buenos Aires',
    category: 'Gimnasio',
    source: 'google_places',
    status: 'active',
    stageId: '3',
    hasWebsite: false,
    webProbability: 92,
    rating: 4.8,
    reviewCount: 567,
    notes: 'Muy interesado en tener presencia online.',
    workspaceId: 'demo',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: '4',
    name: 'Veterinaria San Roque',
    phone: '+54 11 6666-7890',
    email: 'consultas@vetsanroque.com',
    address: 'Av. Belgrano 321, Buenos Aires',
    category: 'Veterinaria',
    source: 'manual',
    status: 'active',
    stageId: '4',
    hasWebsite: false,
    webProbability: 85,
    rating: 4.6,
    reviewCount: 156,
    workspaceId: 'demo',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '5',
    name: 'Café del Centro',
    phone: '+54 11 7777-1234',
    email: 'hola@cafedelcentro.com',
    address: 'Calle Florida 567, Buenos Aires',
    category: 'Cafetería',
    source: 'google_places',
    status: 'active',
    stageId: '5',
    hasWebsite: true,
    website: 'https://cafedelcentro.com.ar',
    webProbability: 25,
    rating: 4.9,
    reviewCount: 892,
    workspaceId: 'demo',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-19'),
  },
]

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    stage: '',
    source: '',
    hasWebsite: null as boolean | null,
  })
  const [showFilters, setShowFilters] = useState(false)

  // Fetch leads from API
  const { data, isLoading } = useQuery({
    queryKey: ['leads', filters, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filters.stage) params.set('stageId', filters.stage)
      if (filters.source) params.set('source', filters.source)
      if (filters.hasWebsite !== null) params.set('hasWebsite', String(filters.hasWebsite))
      
      const response = await fetch(`/api/leads?${params.toString()}`)
      if (!response.ok) throw new Error('Error fetching leads')
      return response.json()
    },
    staleTime: 1000 * 30, // 30 seconds
  })

  const leads: Lead[] = data?.leads || []
  const stages: PipelineStage[] = data?.stages || DEMO_STAGES

  // Filter leads (additional client-side filtering if needed)
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Source filter
      if (filters.source && lead.source !== filters.source) return false

      // Has website filter
      if (filters.hasWebsite !== null && lead.hasWebsite !== filters.hasWebsite) return false

      return true
    })
  }, [leads, filters])

  // Group leads by stage for Kanban
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    stages.forEach((stage) => {
      grouped[stage.id] = filteredLeads.filter((lead) => lead.stageId === stage.id)
    })
    return grouped
  }, [filteredLeads, stages])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Leads</h1>
          <p className="text-dark-muted mt-1">
            {filteredLeads.length} leads en tu pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-dark-card rounded-lg border border-dark-border p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'table'
                  ? 'bg-brand-500 text-white'
                  : 'text-dark-muted hover:text-dark-text'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'kanban'
                  ? 'bg-brand-500 text-white'
                  : 'text-dark-muted hover:text-dark-text'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Link href="/dashboard/search">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Buscar Leads
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filtros
              {(filters.stage || filters.source || filters.hasWebsite !== null) && (
                <span className="ml-1 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                  {(filters.stage ? 1 : 0) +
                    (filters.source ? 1 : 0) +
                    (filters.hasWebsite !== null ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-dark-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Stage filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-2">
                    Etapa
                  </label>
                  <select
                    value={filters.stage}
                    onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-dark-border bg-dark-card text-dark-text"
                  >
                    <option value="">Todas</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-2">
                    Origen
                  </label>
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-dark-border bg-dark-card text-dark-text"
                  >
                    <option value="">Todos</option>
                    <option value="google_places">Google Maps</option>
                    <option value="manual">Manual</option>
                    <option value="referral">Referido</option>
                  </select>
                </div>

                {/* Website filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-2">
                    Sitio web
                  </label>
                  <select
                    value={String(filters.hasWebsite)}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        hasWebsite: e.target.value === 'null' ? null : e.target.value === 'true',
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-dark-border bg-dark-card text-dark-text"
                  >
                    <option value="null">Todos</option>
                    <option value="false">Sin web</option>
                    <option value="true">Con web</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Content */}
      {isLoading ? (
        viewMode === 'table' ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LeadCardSkeleton key={i} />
            ))}
          </div>
        )
      ) : viewMode === 'table' ? (
        <LeadsTable leads={filteredLeads} stages={stages} />
      ) : (
        <LeadsKanban leadsByStage={leadsByStage} stages={stages} />
      )}
    </div>
  )
}

// Table view component
function LeadsTable({ leads, stages }: { leads: Lead[]; stages: PipelineStage[] }) {
  const getStage = (stageId: string) => stages.find((s) => s.id === stageId)

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Negocio</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Categoría</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Etapa</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Probabilidad Web</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Contacto</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Rating</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted">Agregado</th>
              <th className="text-left p-4 text-sm font-medium text-dark-muted"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, index) => {
              const stage = getStage(lead.stageId || '')
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-dark-border hover:bg-dark-hover transition-colors"
                >
                  <td className="p-4">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="font-medium text-dark-text hover:text-brand-400"
                    >
                      {lead.name}
                    </Link>
                    <p className="text-sm text-dark-muted truncate max-w-xs">{lead.address}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant="neutral">{lead.category || 'Sin categoría'}</Badge>
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${stage?.color}20`,
                        color: stage?.color,
                      }}
                    >
                      {stage?.name || 'Sin etapa'}
                    </span>
                  </td>
                  <td className="p-4">
                    <WebProbabilityBadge score={lead.webProbability || 0} size="sm" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-1.5 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="p-1.5 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {lead.rating ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        {lead.rating}
                      </span>
                    ) : (
                      <span className="text-dark-muted">-</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-dark-muted">
                    {formatRelativeTime(lead.createdAt)}
                  </td>
                  <td className="p-4">
                    <Link href={`/dashboard/leads/${lead.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {leads.length === 0 && (
        <div className="p-12 text-center">
          <Users className="w-12 h-12 text-dark-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-text">No hay leads</h3>
          <p className="text-dark-muted mt-2">
            Empezá buscando negocios en Google Maps
          </p>
          <Link href="/dashboard/search">
            <Button variant="primary" className="mt-4" leftIcon={<Plus className="w-4 h-4" />}>
              Buscar Leads
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}

// Kanban view component
function LeadsKanban({
  leadsByStage,
  stages,
}: {
  leadsByStage: Record<string, Lead[]>
  stages: PipelineStage[]
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {stages.map((stage) => (
        <KanbanColumn key={stage.id} stage={stage} leads={leadsByStage[stage.id] || []} />
      ))}
    </div>
  )
}

// Kanban column component
function KanbanColumn({ stage, leads }: { stage: PipelineStage; leads: Lead[] }) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium text-dark-text">{stage.name}</h3>
          <span className="text-sm text-dark-muted">({leads.length})</span>
        </div>
      </div>

      <div className="space-y-3 min-h-[500px] p-2 rounded-lg bg-dark-bg border border-dark-border">
        <AnimatePresence>
          {leads.map((lead, index) => (
            <KanbanCard key={lead.id} lead={lead} index={index} />
          ))}
        </AnimatePresence>

        {leads.length === 0 && (
          <div className="p-4 text-center text-sm text-dark-muted">
            Sin leads en esta etapa
          </div>
        )}
      </div>
    </div>
  )
}

// Kanban card component
function KanbanCard({ lead, index }: { lead: Lead; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      layout
    >
      <Link href={`/dashboard/leads/${lead.id}`}>
        <Card className="p-3 cursor-pointer" hover>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-dark-text text-sm line-clamp-1">
              {lead.name}
            </h4>
            <WebProbabilityBadge score={lead.webProbability || 0} size="sm" />
          </div>

          <p className="text-xs text-dark-muted mt-1 line-clamp-1">{lead.address}</p>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="neutral" className="text-xs">
              {lead.category}
            </Badge>
            {lead.rating && (
              <span className="flex items-center gap-0.5 text-xs text-amber-400">
                <Star className="w-3 h-3 fill-current" />
                {lead.rating}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-border">
            {lead.phone && <Phone className="w-3 h-3 text-dark-muted" />}
            {lead.email && <Mail className="w-3 h-3 text-dark-muted" />}
            {!lead.hasWebsite && (
              <span className="text-xs text-emerald-400">Sin web</span>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
