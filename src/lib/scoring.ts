/**
 * Web Probability Scoring Algorithm
 * 
 * Calcula la probabilidad de que un negocio necesite/se beneficie de tener un sitio web
 * basándose en múltiples factores del negocio obtenidos de Google Places.
 */

export interface BusinessData {
  name: string
  category?: string
  types?: string[]
  website?: string | null
  hasWebsite: boolean
  rating?: number
  reviewCount?: number
  priceLevel?: number // 0-4
  openingHours?: {
    isOpen?: boolean
    weekdayText?: string[]
  }
  address?: string
  city?: string
  photos?: number
  isChain?: boolean
}

export interface ScoreBreakdown {
  noWebsite: number
  categoryScore: number
  ratingScore: number
  reviewsScore: number
  priceLevelScore: number
  photosScore: number
  localBusinessScore: number
  total: number
  factors: ScoreFactor[]
  // New fields for redesign potential
  hasWebsite: boolean
  redesignPotential: number // 0-100, how much they could benefit from redesign
  redesignReason?: string // Why they might need redesign
  opportunityType: 'new_website' | 'redesign' | 'low_priority'
}

export interface ScoreFactor {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  points: number
  description: string
}

// Categorías que más se benefician de tener una web
const HIGH_NEED_CATEGORIES = [
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'hotel',
  'lodging',
  'spa',
  'beauty_salon',
  'hair_care',
  'gym',
  'fitness_center',
  'dentist',
  'doctor',
  'lawyer',
  'accounting',
  'real_estate_agency',
  'car_dealer',
  'car_repair',
  'veterinary_care',
  'pet_store',
  'florist',
  'jewelry_store',
  'clothing_store',
  'furniture_store',
  'home_goods_store',
  'electronics_store',
  'pharmacy',
  'school',
  'university',
  'art_gallery',
  'museum',
  'tourist_attraction',
  'travel_agency',
  'insurance_agency',
  'moving_company',
  'storage',
  'plumber',
  'electrician',
  'roofing_contractor',
  'general_contractor',
  'photographer',
  'event_venue',
  'wedding_venue',
]

// Categorías con menor necesidad de web propia
const LOW_NEED_CATEGORIES = [
  'atm',
  'bank', // Suelen tener webs corporativas
  'gas_station',
  'parking',
  'bus_station',
  'train_station',
  'airport',
  'subway_station',
  'post_office',
  'library',
  'city_hall',
  'courthouse',
  'police',
  'fire_station',
  'hospital', // Suelen tener webs institucionales
  'cemetery',
]

export function calculateWebProbability(business: BusinessData): ScoreBreakdown {
  const factors: ScoreFactor[] = []
  let score = 0

  // Factor 1: No tiene website (máximo impacto: +40 puntos)
  // Si YA tiene website, el score máximo es muy bajo (solo potencial rediseño)
  const hasWebsite = business.hasWebsite || (business.website && business.website.length > 0)
  
  if (!hasWebsite) {
    const noWebsiteScore = 40
    score += noWebsiteScore
    factors.push({
      name: 'Sin sitio web',
      impact: 'positive',
      points: 40,
      description: 'El negocio no tiene presencia web, alta oportunidad',
    })
  } else {
    // Ya tiene website - probabilidad de necesitar uno nuevo es MUY BAJA
    factors.push({
      name: 'Ya tiene sitio web',
      impact: 'negative',
      points: -50,
      description: 'Ya cuenta con presencia web, baja probabilidad de necesitar uno nuevo',
    })
    // Penalización fuerte - el score final será bajo
    score -= 50
  }

  // Factor 2: Categoría del negocio (+0 a +25 puntos)
  let categoryScore = 15 // Default medio
  const businessTypes = business.types || []
  const category = business.category?.toLowerCase() || ''

  const isHighNeed = HIGH_NEED_CATEGORIES.some(
    (cat) => businessTypes.includes(cat) || category.includes(cat)
  )
  const isLowNeed = LOW_NEED_CATEGORIES.some(
    (cat) => businessTypes.includes(cat) || category.includes(cat)
  )

  if (isHighNeed) {
    categoryScore = 25
    factors.push({
      name: 'Categoría de alto valor',
      impact: 'positive',
      points: 25,
      description: `${business.category || 'Este tipo de negocio'} se beneficia mucho de tener web`,
    })
  } else if (isLowNeed) {
    categoryScore = 5
    factors.push({
      name: 'Categoría con menor necesidad',
      impact: 'negative',
      points: 5,
      description: 'Este tipo de negocio suele tener menos necesidad de web propia',
    })
  } else {
    factors.push({
      name: 'Categoría estándar',
      impact: 'neutral',
      points: 15,
      description: 'Necesidad moderada de presencia web',
    })
  }
  score += categoryScore

  // Factor 3: Rating del negocio (+0 a +10 puntos)
  // Negocios con buen rating tienen más para mostrar
  let ratingScore = 5
  if (business.rating) {
    if (business.rating >= 4.5) {
      ratingScore = 10
      factors.push({
        name: 'Excelente reputación',
        impact: 'positive',
        points: 10,
        description: `Rating de ${business.rating}★ - tiene mucho que mostrar en una web`,
      })
    } else if (business.rating >= 4.0) {
      ratingScore = 8
      factors.push({
        name: 'Buena reputación',
        impact: 'positive',
        points: 8,
        description: `Rating de ${business.rating}★ - buena imagen para mostrar`,
      })
    } else if (business.rating >= 3.5) {
      ratingScore = 5
      factors.push({
        name: 'Reputación aceptable',
        impact: 'neutral',
        points: 5,
        description: `Rating de ${business.rating}★`,
      })
    } else {
      ratingScore = 3
      factors.push({
        name: 'Reputación a mejorar',
        impact: 'neutral',
        points: 3,
        description: 'Podría priorizar mejorar reviews antes que invertir en web',
      })
    }
  }
  score += ratingScore

  // Factor 4: Cantidad de reviews (+0 a +10 puntos)
  // Muchas reviews = negocio activo con clientes
  let reviewsScore = 3
  if (business.reviewCount) {
    if (business.reviewCount >= 100) {
      reviewsScore = 10
      factors.push({
        name: 'Negocio muy activo',
        impact: 'positive',
        points: 10,
        description: `${business.reviewCount} reviews - alto volumen de clientes`,
      })
    } else if (business.reviewCount >= 50) {
      reviewsScore = 7
      factors.push({
        name: 'Negocio activo',
        impact: 'positive',
        points: 7,
        description: `${business.reviewCount} reviews - buen flujo de clientes`,
      })
    } else if (business.reviewCount >= 20) {
      reviewsScore = 5
      factors.push({
        name: 'Actividad moderada',
        impact: 'neutral',
        points: 5,
        description: `${business.reviewCount} reviews`,
      })
    } else {
      reviewsScore = 3
      factors.push({
        name: 'Pocas reviews',
        impact: 'neutral',
        points: 3,
        description: 'Negocio nuevo o con bajo volumen',
      })
    }
  }
  score += reviewsScore

  // Factor 5: Nivel de precio (+0 a +10 puntos)
  // Negocios de mayor precio pueden invertir más en marketing
  let priceLevelScore = 5
  if (business.priceLevel !== undefined) {
    if (business.priceLevel >= 3) {
      priceLevelScore = 10
      factors.push({
        name: 'Negocio premium',
        impact: 'positive',
        points: 10,
        description: 'Mayor capacidad de inversión en presencia digital',
      })
    } else if (business.priceLevel === 2) {
      priceLevelScore = 7
      factors.push({
        name: 'Precio medio-alto',
        impact: 'positive',
        points: 7,
        description: 'Buena capacidad de inversión',
      })
    } else if (business.priceLevel === 1) {
      priceLevelScore = 5
      factors.push({
        name: 'Precio accesible',
        impact: 'neutral',
        points: 5,
        description: 'Inversión moderada posible',
      })
    } else {
      priceLevelScore = 3
      factors.push({
        name: 'Precio bajo',
        impact: 'neutral',
        points: 3,
        description: 'Presupuesto más limitado',
      })
    }
  }
  score += priceLevelScore

  // Factor 6: Fotos (+0 a +5 puntos)
  // Negocios con muchas fotos muestran interés en marketing visual
  let photosScore = 2
  if (business.photos) {
    if (business.photos >= 10) {
      photosScore = 5
      factors.push({
        name: 'Contenido visual abundante',
        impact: 'positive',
        points: 5,
        description: 'Ya tiene material para una web atractiva',
      })
    } else if (business.photos >= 5) {
      photosScore = 3
      factors.push({
        name: 'Algo de contenido visual',
        impact: 'neutral',
        points: 3,
        description: 'Tiene algunas fotos para usar',
      })
    }
  }
  score += photosScore

  // Factor 7: Negocio local vs cadena
  // Los negocios locales necesitan más ayuda con presencia digital
  let localBusinessScore = 5
  if (!business.isChain) {
    localBusinessScore = 8
    factors.push({
      name: 'Negocio local independiente',
      impact: 'positive',
      points: 8,
      description: 'Mayor necesidad de diferenciarse con presencia propia',
    })
  } else {
    localBusinessScore = 2
    factors.push({
      name: 'Parte de cadena',
      impact: 'negative',
      points: 2,
      description: 'Probablemente tiene web corporativa',
    })
  }
  score += localBusinessScore

  // Normalizar a 0-100
  const maxPossibleScore = 40 + 25 + 10 + 10 + 10 + 5 + 8 // 108
  
  // Calcular score "raw" sin penalización de website (para potencial de rediseño)
  const rawScoreWithoutWebPenalty = score + (hasWebsite ? 50 : 0) // Revertir la penalización
  const rawNormalized = Math.max(0, Math.min(100, Math.round((rawScoreWithoutWebPenalty / maxPossibleScore) * 100)))
  
  // Score final (penalizado si tiene website)
  let normalizedScore = Math.max(0, Math.round((score / maxPossibleScore) * 100))
  
  // Si ya tiene website, el máximo es 25% (solo por potencial rediseño)
  if (hasWebsite) {
    normalizedScore = Math.min(normalizedScore, 25)
  }
  
  normalizedScore = Math.min(normalizedScore, 100)

  // Calcular potencial de rediseño (solo aplica si tiene website)
  let redesignPotential = 0
  let redesignReason: string | undefined
  let opportunityType: 'new_website' | 'redesign' | 'low_priority' = 'low_priority'
  
  if (!hasWebsite) {
    opportunityType = 'new_website'
  } else {
    // Calcular cuánto se beneficiarían de un rediseño basado en los otros factores
    redesignPotential = rawNormalized
    
    if (redesignPotential >= 70) {
      opportunityType = 'redesign'
      redesignReason = 'Alto potencial: negocio exitoso que podría beneficiarse de una web moderna'
      if (business.rating && business.rating >= 4.5) {
        redesignReason = '⭐ Excelente reputación - Una web premium reflejaría mejor su calidad'
      }
      if (business.reviewCount && business.reviewCount >= 100) {
        redesignReason = '📈 Alto volumen de clientes - Una web optimizada captaría más reservas'
      }
    } else if (redesignPotential >= 50) {
      opportunityType = 'redesign'
      redesignReason = 'Potencial moderado: podría mejorar su presencia digital con un rediseño'
    } else {
      opportunityType = 'low_priority'
      redesignReason = 'Baja prioridad: probablemente tienen equipo interno gestionando su web'
    }
  }

  return {
    noWebsite: hasWebsite ? 0 : 40,
    categoryScore,
    ratingScore,
    reviewsScore,
    priceLevelScore,
    photosScore,
    localBusinessScore,
    total: normalizedScore,
    factors,
    hasWebsite,
    redesignPotential,
    redesignReason,
    opportunityType,
  }
}

// Tipo para colores de score
export type ScoreColor = 'success' | 'warning' | 'danger'

// Función helper para obtener el color según el score
export function getScoreColor(score: number): ScoreColor {
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'danger'
}

// Función helper para obtener etiqueta del score
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Muy Alta'
  if (score >= 60) return 'Alta'
  if (score >= 40) return 'Media'
  if (score >= 20) return 'Baja'
  return 'Muy Baja'
}

// Tipo de oportunidad
export type OpportunityType = 'new_website' | 'redesign' | 'low_priority'

// Obtener etiqueta del tipo de oportunidad
export function getOpportunityLabel(type: OpportunityType): string {
  switch (type) {
    case 'new_website':
      return '🎯 Nueva Web'
    case 'redesign':
      return '🔄 Potencial Rediseño'
    case 'low_priority':
      return '⏸️ Baja Prioridad'
  }
}

// Obtener color del tipo de oportunidad
export function getOpportunityColor(type: OpportunityType): string {
  switch (type) {
    case 'new_website':
      return 'success' // Verde - alta oportunidad
    case 'redesign':
      return 'warning' // Amarillo/Naranja - oportunidad moderada
    case 'low_priority':
      return 'secondary' // Gris - baja prioridad
  }
}

// Obtener descripción completa de la oportunidad
export function getOpportunityDescription(scoring: ScoreBreakdown): string {
  if (!scoring.hasWebsite) {
    if (scoring.total >= 70) {
      return '🔥 ¡Alta oportunidad! Este negocio no tiene web y tiene excelente perfil'
    } else if (scoring.total >= 40) {
      return '✨ Buena oportunidad - Negocio sin web con potencial'
    } else {
      return '📋 Negocio sin web - Prioridad baja'
    }
  } else {
    if (scoring.redesignPotential >= 70) {
      return `🔄 Candidato a rediseño - ${scoring.redesignReason}`
    } else if (scoring.redesignPotential >= 50) {
      return `💡 Posible rediseño - ${scoring.redesignReason}`
    } else {
      return `✅ Ya tiene web - ${scoring.redesignReason}`
    }
  }
}

// Detectar si es una cadena conocida
export function detectChain(name: string): boolean {
  const chains = [
    'mcdonald',
    'burger king',
    'starbucks',
    'subway',
    'kfc',
    'pizza hut',
    'domino',
    'wendy',
    'taco bell',
    'dunkin',
    'costa coffee',
    'walmart',
    'target',
    'carrefour',
    'coto',
    'disco',
    'jumbo',
    'easy',
    'sodimac',
    'ikea',
    'zara',
    'h&m',
    'nike',
    'adidas',
    'gap',
    'uniqlo',
    'banco',
    'bank',
    'santander',
    'bbva',
    'hsbc',
    'galicia',
    'macro',
    'nacion',
    'provincia',
    'ciudad',
    'farmacity',
    'farmacias del pueblo',
  ]

  const lowerName = name.toLowerCase()
  return chains.some((chain) => lowerName.includes(chain))
}
