import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { PlaceSearchResult } from '@/types'

// Helper function to get or create user's workspace
async function getOrCreateWorkspace(userId: string, userEmail: string) {
  // Try to find existing workspace membership
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  })

  if (membership) {
    return membership.workspace
  }

  // Create a new workspace for the user
  const workspace = await prisma.workspace.create({
    data: {
      name: `Workspace de ${userEmail.split('@')[0]}`,
      slug: `ws-${userId.slice(0, 8)}`,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
      // Create default pipeline stages
      pipelineStages: {
        create: [
          { name: 'Nuevo', color: '#6366f1', order: 0, isDefault: true },
          { name: 'Contactado', color: '#f59e0b', order: 1 },
          { name: 'Propuesta', color: '#3b82f6', order: 2 },
          { name: 'Negociación', color: '#8b5cf6', order: 3 },
          { name: 'Ganado', color: '#10b981', order: 4, isWon: true },
          { name: 'Perdido', color: '#ef4444', order: 5, isLost: true },
        ],
      },
    },
    include: {
      pipelineStages: true,
    },
  })

  return workspace
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { places } = body as {
      places: PlaceSearchResult[]
    }

    if (!places || !Array.isArray(places) || places.length === 0) {
      return NextResponse.json({ error: 'No places provided' }, { status: 400 })
    }

    // Get or create workspace for user
    const workspace = await getOrCreateWorkspace(session.user.id, session.user.email || 'user')
    const workspaceId = workspace.id

    // Get default pipeline stage
    const defaultStage = await prisma.pipelineStage.findFirst({
      where: {
        workspaceId,
        isDefault: true,
      },
    })

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const place of places) {
      try {
        // Check for duplicates by placeId
        const existingByPlaceId = await prisma.lead.findUnique({
          where: { placeId: place.placeId },
        })

        if (existingByPlaceId) {
          results.skipped++
          continue
        }

        // Check for duplicates by phone if no placeId match
        if (place.phone) {
          const existingByPhone = await prisma.lead.findFirst({
            where: {
              workspaceId,
              phone: place.phone,
            },
          })

          if (existingByPhone) {
            results.skipped++
            continue
          }
        }

        // Create lead
        await prisma.lead.create({
          data: {
            name: place.name,
            phone: place.phone,
            website: place.website,
            placeId: place.placeId,
            businessName: place.name,
            address: place.address,
            city: place.city,
            country: place.country,
            latitude: place.latitude,
            longitude: place.longitude,
            category: place.category,
            rating: place.rating,
            reviewCount: place.reviewCount,
            priceLevel: place.priceLevel,
            source: 'GOOGLE_PLACES',
            score: Math.round(place.webProbability / 20), // Convert to 1-5 scale
            webProbability: place.webProbability,
            workspaceId,
            ownerId: session.user.id,
            stageId: defaultStage?.id,
          },
        })

        results.imported++
      } catch (error: any) {
        results.errors.push(`Error importing ${place.name}: ${error.message}`)
      }
    }

    // Create activity log for import
    if (results.imported > 0) {
      await prisma.auditLog.create({
        data: {
          action: 'IMPORT_LEADS',
          entityType: 'LEAD',
          entityId: 'bulk',
          newData: {
            count: results.imported,
            source: 'GOOGLE_PLACES',
          },
          userId: session.user.id,
          workspaceId,
        },
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
