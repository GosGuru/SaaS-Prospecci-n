'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  ExternalLink,
  Plus,
  Check,
  Filter,
  SlidersHorizontal,
  Loader2,
  ChevronDown,
  X,
  Info,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, SearchInput } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { WebProbabilityBadge, ProbabilityBar } from '@/components/ui/web-probability'
import { ProspectSearchSkeleton } from '@/components/ui/skeleton'
import { cn, debounce } from '@/lib/utils'
import type { PlaceSearchResult, PlaceSearchParams } from '@/types'
import toast from 'react-hot-toast'

// Popular search suggestions
const SEARCH_SUGGESTIONS = [
  { category: 'Gastronomía', searches: ['restaurantes', 'cafeterías', 'bares', 'pizzerías'] },
  { category: 'Salud', searches: ['dentistas', 'veterinarias', 'clínicas', 'farmacias'] },
  { category: 'Servicios', searches: ['peluquerías', 'gimnasios', 'inmobiliarias', 'talleres mecánicos'] },
  { category: 'Comercio', searches: ['tiendas de ropa', 'joyerías', 'ferreterías', 'floristerías'] },
]

// Example locations (user can type any location)
const LOCATION_SUGGESTIONS = [
  'Buenos Aires, Argentina',
  'Montevideo, Uruguay',
  'Santiago, Chile',
  'Lima, Perú',
  'Bogotá, Colombia',
  'Ciudad de México, México',
  'Madrid, España',
  'Miami, USA',
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minRating: 0,
    hasWebsite: null as boolean | null,
    hasPhone: false,
  })
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [detailModalPlace, setDetailModalPlace] = useState<PlaceSearchResult | null>(null)

  // Search query
  const {
    data: searchResults,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['places-search', searchQuery, location, filters],
    queryFn: async () => {
      if (!searchQuery) return { results: [], total: 0, isDemo: true }

      const params: PlaceSearchParams = {
        query: location ? `${searchQuery} en ${location}` : searchQuery,
        minRating: filters.minRating || undefined,
        hasWebsite: filters.hasWebsite,
        hasPhone: filters.hasPhone || undefined,
      }

      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      return response.json()
    },
    enabled: searchQuery.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (places: PlaceSearchResult[]) => {
      const response = await fetch('/api/places/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places }),
      })

      if (!response.ok) {
        throw new Error('Error al importar')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`${data.imported} leads importados correctamente`)
      setSelectedPlaces(new Set())
    },
    onError: () => {
      toast.error('Error al importar los leads')
    },
  })

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value)
    }, 500),
    []
  )

  const handleSearch = (value: string) => {
    debouncedSearch(value)
  }

  const toggleSelectPlace = (placeId: string) => {
    const newSelected = new Set(selectedPlaces)
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId)
    } else {
      newSelected.add(placeId)
    }
    setSelectedPlaces(newSelected)
  }

  const selectAll = () => {
    if (!searchResults?.results) return
    const allIds = new Set<string>(searchResults.results.map((p: PlaceSearchResult) => p.placeId))
    setSelectedPlaces(allIds)
  }

  const handleImport = () => {
    if (!searchResults?.results) return
    const placesToImport = searchResults.results.filter((p: PlaceSearchResult) =>
      selectedPlaces.has(p.placeId)
    )
    importMutation.mutate(placesToImport)
  }

  const handleQuickSearch = (search: string) => {
    setSearchQuery(search)
  }

  const results = searchResults?.results || []
  const isDemo = searchResults?.isDemo

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Buscar en Maps</h1>
          <p className="text-dark-muted mt-1">
            Encontrá negocios por nicho y ubicación, con análisis de probabilidad de necesitar web
          </p>
        </div>
        {isDemo && (
          <Badge variant="brand" dot>
            Datos Demo
          </Badge>
        )}
      </div>

      {/* Search Section */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main search input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-dark-muted mb-2">
              ¿Qué tipo de negocio buscás?
            </label>
            <SearchInput
              placeholder="Ej: restaurantes, peluquerías, gimnasios..."
              onChange={(e) => handleSearch(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Location input - free text */}
          <div className="w-full md:w-72">
            <label className="block text-sm font-medium text-dark-muted mb-2">
              Ubicación (opcional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Montevideo, Uruguay"
                list="location-suggestions"
                className="w-full h-12 pl-10 pr-4 rounded-lg border border-dark-border bg-dark-card text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <datalist id="location-suggestions">
                {LOCATION_SUGGESTIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Filters button */}
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
              className="h-12"
            >
              Filtros
              {(filters.minRating > 0 || filters.hasWebsite !== null) && (
                <span className="ml-1 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                  {(filters.minRating > 0 ? 1 : 0) + (filters.hasWebsite !== null ? 1 : 0)}
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
              <div className="pt-4 mt-4 border-t border-dark-border grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Min rating */}
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-2">
                    Rating mínimo
                  </label>
                  <div className="flex gap-2">
                    {[0, 3, 3.5, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setFilters({ ...filters, minRating: rating })}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm transition-colors',
                          filters.minRating === rating
                            ? 'bg-brand-500 text-white'
                            : 'bg-dark-hover text-dark-muted hover:text-dark-text'
                        )}
                      >
                        {rating === 0 ? 'Todos' : `${rating}★+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Has website */}
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-2">
                    Tiene sitio web
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: null, label: 'Todos' },
                      { value: false, label: 'Sin web' },
                      { value: true, label: 'Con web' },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        onClick={() => setFilters({ ...filters, hasWebsite: option.value })}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm transition-colors',
                          filters.hasWebsite === option.value
                            ? 'bg-brand-500 text-white'
                            : 'bg-dark-hover text-dark-muted hover:text-dark-text'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear filters */}
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setFilters({ minRating: 0, hasWebsite: null, hasPhone: false })
                    }
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick search suggestions */}
        {!searchQuery && (
          <div className="mt-6">
            <p className="text-sm text-dark-muted mb-3">Búsquedas populares:</p>
            <div className="flex flex-wrap gap-2">
              {SEARCH_SUGGESTIONS.flatMap((cat) =>
                cat.searches.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleQuickSearch(s)}
                    className="px-3 py-1.5 rounded-full bg-dark-hover text-dark-muted hover:text-dark-text hover:bg-dark-border transition-colors text-sm"
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Results section */}
      {searchQuery && (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-dark-text">
                {isLoading ? (
                  'Buscando...'
                ) : (
                  <>
                    {results.length} resultados para "{searchQuery}"{location ? ` en ${location}` : ''}
                  </>
                )}
              </h2>
              {!isLoading && results.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-sm text-brand-400 hover:text-brand-300"
                >
                  Seleccionar todos
                </button>
              )}
            </div>

            {selectedPlaces.size > 0 && (
              <Button
                variant="primary"
                onClick={handleImport}
                isLoading={importMutation.isPending}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Importar {selectedPlaces.size} al CRM
              </Button>
            )}
          </div>

          {/* Results list */}
          {isLoading ? (
            <ProspectSearchSkeleton />
          ) : isError ? (
            <Card className="p-8 text-center">
              <p className="text-danger">Error al buscar. Intentá de nuevo.</p>
              <Button variant="secondary" onClick={() => refetch()} className="mt-4">
                Reintentar
              </Button>
            </Card>
          ) : results.length === 0 ? (
            <Card className="p-8 text-center">
              <MapPin className="w-12 h-12 text-dark-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-dark-text">No se encontraron resultados</h3>
              <p className="text-dark-muted mt-2">
                Probá con otros términos de búsqueda o cambiá la ubicación
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((place: PlaceSearchResult, index: number) => (
                <PlaceCard
                  key={place.placeId}
                  place={place}
                  index={index}
                  isSelected={selectedPlaces.has(place.placeId)}
                  onToggleSelect={() => toggleSelectPlace(place.placeId)}
                  onViewDetails={() => setDetailModalPlace(place)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Initial state - categories */}
      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SEARCH_SUGGESTIONS.map((category) => (
            <Card key={category.category} className="p-4" hover>
              <h3 className="font-medium text-dark-text mb-3">{category.category}</h3>
              <div className="space-y-2">
                {category.searches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handleQuickSearch(search)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text hover:bg-dark-border transition-colors text-sm capitalize"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <PlaceDetailModal
        place={detailModalPlace}
        isOpen={!!detailModalPlace}
        onClose={() => setDetailModalPlace(null)}
        onImport={() => {
          if (detailModalPlace) {
            importMutation.mutate([detailModalPlace])
            setDetailModalPlace(null)
          }
        }}
      />
    </div>
  )
}

// Place Card Component
interface PlaceCardProps {
  place: PlaceSearchResult
  index: number
  isSelected: boolean
  onToggleSelect: () => void
  onViewDetails: () => void
}

function PlaceCard({ place, index, isSelected, onToggleSelect, onViewDetails }: PlaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          'p-4 transition-all duration-200',
          isSelected && 'ring-2 ring-brand-500 bg-brand-500/5'
        )}
      >
        <div className="flex items-start gap-4">
          {/* Selection checkbox */}
          <button
            onClick={onToggleSelect}
            className={cn(
              'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-1',
              isSelected
                ? 'bg-brand-500 border-brand-500'
                : 'border-dark-border hover:border-brand-500'
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-dark-text truncate">{place.name}</h3>
                <p className="text-sm text-dark-muted flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {place.address}
                </p>
              </div>

              {/* Opportunity Badge */}
              <div className="flex flex-col items-end gap-1">
                {place.opportunityType === 'new_website' ? (
                  <Badge variant="success" className="whitespace-nowrap">
                    🎯 Nueva Web
                  </Badge>
                ) : place.opportunityType === 'redesign' ? (
                  <Badge variant="warning" className="whitespace-nowrap">
                    🔄 Rediseño
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="whitespace-nowrap">
                    ⏸️ Baja Prioridad
                  </Badge>
                )}
                <WebProbabilityBadge score={place.webProbability} size="sm" />
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge variant="neutral">{place.category}</Badge>
              
              {place.rating && (
                <span className="flex items-center gap-1 text-sm text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  {place.rating} ({place.reviewCount || 0})
                </span>
              )}

              {place.phone && (
                <span className="flex items-center gap-1 text-sm text-dark-muted">
                  <Phone className="w-4 h-4" />
                  {place.phone}
                </span>
              )}

              {place.hasWebsite ? (
                <Badge variant="warning">
                  <Globe className="w-3 h-3 mr-1" />
                  Tiene web
                </Badge>
              ) : (
                <Badge variant="success">
                  <X className="w-3 h-3 mr-1" />
                  Sin web
                </Badge>
              )}
            </div>

            {/* Redesign reason if applicable */}
            {place.opportunityType === 'redesign' && place.redesignReason && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                💡 {place.redesignReason}
              </p>
            )}

            {/* Probability bar */}
            <div className="mt-3">
              <ProbabilityBar score={place.webProbability} height="sm" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" onClick={onViewDetails}>
              <Info className="w-4 h-4" />
            </Button>
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Place Detail Modal
interface PlaceDetailModalProps {
  place: PlaceSearchResult | null
  isOpen: boolean
  onClose: () => void
  onImport: () => void
}

function PlaceDetailModal({ place, isOpen, onClose, onImport }: PlaceDetailModalProps) {
  if (!place) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={place.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Opportunity Badge */}
        <div className="flex items-center gap-3">
          {place.opportunityType === 'new_website' ? (
            <div className="flex-1 flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-semibold text-emerald-400">Nueva Web - Alta Oportunidad</p>
                <p className="text-sm text-dark-muted">Este negocio no tiene presencia digital</p>
              </div>
            </div>
          ) : place.opportunityType === 'redesign' ? (
            <div className="flex-1 flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="font-semibold text-amber-400">Potencial Rediseño</p>
                <p className="text-sm text-dark-muted">{place.redesignReason || 'Podría beneficiarse de una web moderna'}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 p-4 rounded-lg bg-dark-hover border border-dark-border">
              <span className="text-2xl">⏸️</span>
              <div>
                <p className="font-semibold text-dark-muted">Baja Prioridad</p>
                <p className="text-sm text-dark-muted">{place.redesignReason || 'Probablemente tiene equipo interno'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Header with probability */}
        <div className="flex items-center gap-6">
          <WebProbabilityBadge score={place.webProbability} size="lg" />
          <div className="flex-1">
            <ProbabilityBar score={place.webProbability} />
            <p className="text-sm text-dark-muted mt-2">
              {place.hasWebsite 
                ? `Potencial de rediseño: ${place.redesignPotential || 0}%`
                : 'Probabilidad de que este negocio se beneficie de tener un sitio web'
              }
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-dark-muted">Categoría</span>
            <p className="text-dark-text">{place.category}</p>
          </div>
          <div>
            <span className="text-sm text-dark-muted">Rating</span>
            <p className="text-dark-text flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-current" />
              {place.rating || 'N/A'} ({place.reviewCount || 0} reviews)
            </p>
          </div>
          <div>
            <span className="text-sm text-dark-muted">Teléfono</span>
            <p className="text-dark-text">{place.phone || 'No disponible'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-muted">Sitio web</span>
            <p className="text-dark-text">
              {place.website ? (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:underline flex items-center gap-1"
                >
                  Visitar <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-emerald-400">No tiene (oportunidad!)</span>
              )}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-sm text-dark-muted">Dirección</span>
            <p className="text-dark-text">{place.address}</p>
          </div>
        </div>

        {/* Why this score */}
        <div className="p-4 rounded-lg bg-dark-hover">
          <h4 className="font-medium text-dark-text flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            ¿Por qué este score?
          </h4>
          <ul className="space-y-2 text-sm">
            {!place.hasWebsite && (
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" />
                No tiene sitio web - Alta oportunidad
              </li>
            )}
            {place.rating && place.rating >= 4 && (
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" />
                Excelente reputación ({place.rating}★) - Mucho para mostrar
              </li>
            )}
            {place.reviewCount && place.reviewCount >= 50 && (
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" />
                Negocio activo ({place.reviewCount} reviews)
              </li>
            )}
            {!place.isChain && (
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" />
                Negocio local independiente
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-dark-border">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={onImport} leftIcon={<Plus className="w-4 h-4" />}>
            Importar al CRM
          </Button>
        </div>
      </div>
    </Modal>
  )
}
