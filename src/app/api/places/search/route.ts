import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { calculateWebProbability, detectChain, type BusinessData } from '@/lib/scoring'
import type { PlaceSearchResult, PlaceSearchParams } from '@/types'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const DEMO_MODE = process.env.DEMO_MODE === 'true'
const FALLBACK_TO_DEMO_ON_PROVIDER_ERROR = process.env.PLACES_FALLBACK_TO_DEMO_ON_ERROR !== 'false'

// Demo data for testing without API key
const DEMO_RESULTS: PlaceSearchResult[] = [
  {
    placeId: 'demo_1',
    name: 'Restaurante El Buen Sabor',
    address: 'Av. Corrientes 1234, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.603722,
    longitude: -58.381592,
    types: ['restaurant', 'food'],
    category: 'Restaurante',
    rating: 4.5,
    reviewCount: 127,
    priceLevel: 2,
    phone: '+54 11 4123-4567',
    photos: 15,
    hasWebsite: false,
    isChain: false,
    webProbability: 85,
  },
  {
    placeId: 'demo_2',
    name: 'Café La Esquina',
    address: 'Av. Santa Fe 2345, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.595123,
    longitude: -58.401234,
    types: ['cafe', 'food'],
    category: 'Café',
    rating: 4.2,
    reviewCount: 89,
    priceLevel: 1,
    phone: '+54 11 4234-5678',
    website: 'https://caffelaesquina.com.ar',
    photos: 8,
    hasWebsite: true,
    isChain: false,
    webProbability: 35,
  },
  {
    placeId: 'demo_3',
    name: 'Peluquería Estilo & Belleza',
    address: 'Av. Rivadavia 5678, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.620567,
    longitude: -58.420789,
    types: ['beauty_salon', 'hair_care'],
    category: 'Peluquería',
    rating: 4.7,
    reviewCount: 203,
    priceLevel: 2,
    phone: '+54 11 4345-6789',
    photos: 22,
    hasWebsite: false,
    isChain: false,
    webProbability: 92,
  },
  {
    placeId: 'demo_4',
    name: 'Gimnasio Power Fitness',
    address: 'Av. Cabildo 789, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.561234,
    longitude: -58.461234,
    types: ['gym', 'fitness_center'],
    category: 'Gimnasio',
    rating: 4.0,
    reviewCount: 156,
    priceLevel: 2,
    phone: '+54 11 4456-7890',
    photos: 12,
    hasWebsite: false,
    isChain: false,
    webProbability: 78,
  },
  {
    placeId: 'demo_5',
    name: 'Clínica Dental Sonrisa',
    address: 'Av. Belgrano 3456, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.612345,
    longitude: -58.382345,
    types: ['dentist', 'health'],
    category: 'Dentista',
    rating: 4.8,
    reviewCount: 312,
    priceLevel: 3,
    phone: '+54 11 4567-8901',
    photos: 18,
    hasWebsite: false,
    isChain: false,
    webProbability: 88,
  },
  {
    placeId: 'demo_6',
    name: 'Inmobiliaria Hogar Feliz',
    address: 'Av. Callao 1234, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.604567,
    longitude: -58.392345,
    types: ['real_estate_agency'],
    category: 'Inmobiliaria',
    rating: 4.3,
    reviewCount: 67,
    priceLevel: 3,
    phone: '+54 11 4678-9012',
    photos: 25,
    hasWebsite: false,
    isChain: false,
    webProbability: 95,
  },
  {
    placeId: 'demo_7',
    name: 'Taller Mecánico AutoPro',
    address: 'Av. Juan B. Justo 4567, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.598765,
    longitude: -58.438765,
    types: ['car_repair'],
    category: 'Taller Mecánico',
    rating: 4.4,
    reviewCount: 145,
    priceLevel: 2,
    phone: '+54 11 4789-0123',
    photos: 9,
    hasWebsite: false,
    isChain: false,
    webProbability: 72,
  },
  {
    placeId: 'demo_8',
    name: 'Veterinaria Patitas',
    address: 'Av. Córdoba 2345, CABA',
    city: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.599876,
    longitude: -58.399876,
    types: ['veterinary_care'],
    category: 'Veterinaria',
    rating: 4.9,
    reviewCount: 278,
    priceLevel: 2,
    phone: '+54 11 4890-1234',
    website: 'https://vetpatitas.com',
    photos: 30,
    hasWebsite: true,
    isChain: false,
    webProbability: 28,
  },
]

// Field mask for Places API v2 - get all fields we need in one call
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.photos',
].join(',')

function filterDemoResults(
  query: string,
  minRating?: number,
  hasWebsite?: boolean | null
): PlaceSearchResult[] {
  let results = [...DEMO_RESULTS]

  const lowerQuery = query.toLowerCase()
  results = results.filter(
    (r) =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.category.toLowerCase().includes(lowerQuery) ||
      r.types.some((t) => t.includes(lowerQuery))
  )

  if (minRating) {
    results = results.filter((r) => (r.rating || 0) >= minRating)
  }

  if (hasWebsite !== undefined && hasWebsite !== null) {
    results = results.filter((r) => r.hasWebsite === hasWebsite)
  }

  if (results.length === 0) {
    results = DEMO_RESULTS
  }

  return results
}

async function parseJsonSafely(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PlaceSearchParams = await req.json()
    const { query, location, minRating, hasWebsite } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }

    // Demo mode - return mock data
    if (DEMO_MODE || !GOOGLE_PLACES_API_KEY) {
      const results = filterDemoResults(query, minRating, hasWebsite)

      return NextResponse.json({
        results,
        total: results.length,
        isDemo: true,
      })
    }

    // Build text query with location
    const textQuery = `${query} en ${location}`

    // Use Places API v2 (New) - Text Search
    // This API returns more fields in a single call, reducing N+1 calls
    const allResults: PlaceSearchResult[] = []
    let pageToken: string | undefined = undefined
    let pageCount = 0
    const MAX_PAGES = 3 // Max 60 results (20 per page)

    do {
      const requestBody: any = {
        textQuery,
        languageCode: 'es',
        maxResultCount: 20,
      }

      if (pageToken) {
        requestBody.pageToken = pageToken
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await parseJsonSafely(response)

      if (!response.ok || data?.error) {
        const providerError = data?.error
        const details =
          providerError?.message ||
          data?.message ||
          `Google Places respondió ${response.status}`

        console.error('Google Places API v2 error:', {
          status: response.status,
          details,
          payload: data,
        })

        if (FALLBACK_TO_DEMO_ON_PROVIDER_ERROR) {
          const results = filterDemoResults(query, minRating, hasWebsite)

          return NextResponse.json({
            results,
            total: results.length,
            isDemo: true,
            warning: `Google Places no disponible: ${details}`,
          })
        }

        return NextResponse.json(
          { error: 'Error searching places', details },
          { status: 502 }
        )
      }

      // Process results from this page
      const places = data.places || []
      
      for (const place of places) {
        const hasWebsiteValue = !!place.websiteUri
        const isChain = detectChain(place.displayName?.text || '')

        // Extract city and country from address components
        let city = ''
        let country = ''
        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types?.includes('locality')) {
              city = component.longText
            }
            if (component.types?.includes('country')) {
              country = component.longText
            }
          }
        }

        // Calculate web probability
        const businessData: BusinessData = {
          name: place.displayName?.text || '',
          types: place.types || [],
          category: place.types?.[0] || 'business',
          website: place.websiteUri,
          hasWebsite: hasWebsiteValue,
          rating: place.rating,
          reviewCount: place.userRatingCount,
          priceLevel: place.priceLevel ? parseInt(place.priceLevel.replace('PRICE_LEVEL_', '')) : undefined,
          photos: place.photos?.length || 0,
          isChain,
        }

        const scoring = calculateWebProbability(businessData)

        // Map price level from API v2 format
        let priceLevel: number | undefined
        if (place.priceLevel) {
          const priceLevelMap: Record<string, number> = {
            'PRICE_LEVEL_FREE': 0,
            'PRICE_LEVEL_INEXPENSIVE': 1,
            'PRICE_LEVEL_MODERATE': 2,
            'PRICE_LEVEL_EXPENSIVE': 3,
            'PRICE_LEVEL_VERY_EXPENSIVE': 4,
          }
          priceLevel = priceLevelMap[place.priceLevel]
        }

        const result: PlaceSearchResult = {
          placeId: place.id,
          name: place.displayName?.text || 'Sin nombre',
          address: place.formattedAddress || '',
          city,
          country,
          latitude: place.location?.latitude,
          longitude: place.location?.longitude,
          types: place.types || [],
          category: (place.types?.[0] || 'business')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          rating: place.rating,
          reviewCount: place.userRatingCount,
          priceLevel,
          website: place.websiteUri,
          phone: place.internationalPhoneNumber || place.nationalPhoneNumber,
          photos: place.photos?.length || 0,
          hasWebsite: hasWebsiteValue,
          isChain,
          webProbability: scoring.total,
          opportunityType: scoring.opportunityType,
          redesignPotential: scoring.redesignPotential,
          redesignReason: scoring.redesignReason,
        }

        allResults.push(result)
      }

      // Get next page token
      pageToken = data.nextPageToken
      pageCount++

      // Wait 2 seconds between pages (Google requirement)
      if (pageToken && pageCount < MAX_PAGES) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } while (pageToken && pageCount < MAX_PAGES)

    // Apply filters
    let filteredResults = allResults

    if (minRating) {
      filteredResults = filteredResults.filter((r) => (r.rating || 0) >= minRating)
    }

    if (hasWebsite !== undefined && hasWebsite !== null) {
      filteredResults = filteredResults.filter((r) => r.hasWebsite === hasWebsite)
    }

    // Sort by web probability (highest first)
    filteredResults.sort((a, b) => b.webProbability - a.webProbability)

    return NextResponse.json({
      results: filteredResults,
      total: filteredResults.length,
      isDemo: false,
      pagesSearched: pageCount,
    })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
