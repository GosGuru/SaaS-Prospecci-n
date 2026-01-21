import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { calculateWebProbability, detectChain, type BusinessData } from '@/lib/scoring'
import type { PlaceSearchResult, PlaceSearchParams } from '@/types'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const DEMO_MODE = process.env.DEMO_MODE === 'true'

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PlaceSearchParams = await req.json()
    const { query, location, radius = 5000, type, minRating, hasWebsite } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Demo mode - return mock data
    if (DEMO_MODE || !GOOGLE_PLACES_API_KEY) {
      let results = [...DEMO_RESULTS]

      // Filter by query
      if (query) {
        const lowerQuery = query.toLowerCase()
        results = results.filter(
          (r) =>
            r.name.toLowerCase().includes(lowerQuery) ||
            r.category.toLowerCase().includes(lowerQuery) ||
            r.types.some((t) => t.includes(lowerQuery))
        )
      }

      // Filter by rating
      if (minRating) {
        results = results.filter((r) => (r.rating || 0) >= minRating)
      }

      // Filter by website
      if (hasWebsite !== undefined && hasWebsite !== null) {
        results = results.filter((r) => r.hasWebsite === hasWebsite)
      }

      // If no matches, return all demo data
      if (results.length === 0) {
        results = DEMO_RESULTS
      }

      return NextResponse.json({
        results,
        total: results.length,
        isDemo: true,
      })
    }

    // Real Google Places API call
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    searchUrl.searchParams.set('query', query)
    searchUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
    
    if (location) {
      searchUrl.searchParams.set('location', `${location.lat},${location.lng}`)
      searchUrl.searchParams.set('radius', radius.toString())
    }
    
    if (type) {
      searchUrl.searchParams.set('type', type)
    }

    const response = await fetch(searchUrl.toString())
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data)
      return NextResponse.json(
        { error: 'Error searching places', details: data.status },
        { status: 500 }
      )
    }

    const results: PlaceSearchResult[] = await Promise.all(
      (data.results || []).map(async (place: any) => {
        // Get place details for more info
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailsUrl.searchParams.set('place_id', place.place_id)
        detailsUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
        detailsUrl.searchParams.set(
          'fields',
          'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,price_level,types,geometry,opening_hours,photos,address_components'
        )

        const detailsResponse = await fetch(detailsUrl.toString())
        const detailsData = await detailsResponse.json()
        const details = detailsData.result || {}

        const hasWebsite = !!details.website
        const isChain = detectChain(place.name)

        // Calculate web probability
        const businessData: BusinessData = {
          name: place.name,
          types: details.types || place.types,
          category: details.types?.[0] || place.types?.[0] || 'business',
          website: details.website,
          hasWebsite,
          rating: details.rating || place.rating,
          reviewCount: details.user_ratings_total,
          priceLevel: details.price_level,
          photos: details.photos?.length || 0,
          isChain,
        }

        const scoring = calculateWebProbability(businessData)

        // Extract city from address components
        let city = ''
        let country = ''
        if (details.address_components) {
          for (const component of details.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name
            }
            if (component.types.includes('country')) {
              country = component.long_name
            }
          }
        }

        return {
          placeId: place.place_id,
          name: place.name,
          address: details.formatted_address || place.formatted_address,
          city,
          country,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          types: details.types || place.types || [],
          category: (details.types?.[0] || place.types?.[0] || 'business')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          rating: details.rating || place.rating,
          reviewCount: details.user_ratings_total,
          priceLevel: details.price_level,
          website: details.website,
          // Prefer international_phone_number (includes country code) over formatted_phone_number (local format)
          phone: details.international_phone_number || details.formatted_phone_number,
          openingHours: details.opening_hours
            ? {
                isOpen: details.opening_hours.open_now,
                weekdayText: details.opening_hours.weekday_text,
              }
            : undefined,
          photos: details.photos?.length || 0,
          hasWebsite,
          isChain,
          webProbability: scoring.total,
          // Opportunity info
          opportunityType: scoring.opportunityType,
          redesignPotential: scoring.redesignPotential,
          redesignReason: scoring.redesignReason,
        } as PlaceSearchResult
      })
    )

    // Apply filters
    let filteredResults = results

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
    })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
