import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Helper function to get user's workspace
async function getUserWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  })
  return membership?.workspace
}

// GET /api/leads - List leads with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let workspaceId = searchParams.get('workspaceId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const stageId = searchParams.get('stageId')
    const source = searchParams.get('source')
    const ownerId = searchParams.get('ownerId')
    const hasWebsite = searchParams.get('hasWebsite')
    const minScore = searchParams.get('minScore')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Auto-get workspace if not provided
    if (!workspaceId) {
      const workspace = await getUserWorkspace(session.user.id)
      if (!workspace) {
        return NextResponse.json({ leads: [], total: 0, page: 1, limit, totalPages: 0 })
      }
      workspaceId = workspace.id
    }

    // Build where clause
    const where: any = {
      workspaceId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (stageId) {
      where.stageId = stageId
    }

    if (source) {
      where.source = source
    }

    if (ownerId) {
      where.ownerId = ownerId
    }

    if (hasWebsite !== null && hasWebsite !== undefined) {
      if (hasWebsite === 'true') {
        where.website = { not: null }
      } else if (hasWebsite === 'false') {
        where.website = null
      }
    }

    if (minScore) {
      where.score = { gte: parseInt(minScore) }
    }

    const [leads, total, stages] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          stage: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: {
              activities: true,
              tasks: true,
              outboundMessages: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
      prisma.pipelineStage.findMany({
        where: { workspaceId },
        orderBy: { order: 'asc' },
      }),
    ])

    // Transform the data
    const transformedLeads = leads.map((lead) => ({
      ...lead,
      tags: lead.tags.map((lt) => lt.tag),
      hasWebsite: !!lead.website,
    }))

    return NextResponse.json({
      leads: transformedLeads,
      stages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Get leads error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create new lead
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      workspaceId,
      name,
      email,
      phone,
      website,
      businessName,
      address,
      city,
      category,
      notes,
      tagIds,
    } = body

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'Workspace ID and name are required' },
        { status: 400 }
      )
    }

    // Verify workspace access
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get default stage
    const defaultStage = await prisma.pipelineStage.findFirst({
      where: {
        workspaceId,
        isDefault: true,
      },
    })

    // Check for duplicates
    if (email) {
      const existingByEmail = await prisma.lead.findFirst({
        where: { workspaceId, email },
      })
      if (existingByEmail) {
        return NextResponse.json(
          { error: 'A lead with this email already exists' },
          { status: 409 }
        )
      }
    }

    if (phone) {
      const existingByPhone = await prisma.lead.findFirst({
        where: { workspaceId, phone },
      })
      if (existingByPhone) {
        return NextResponse.json(
          { error: 'A lead with this phone already exists' },
          { status: 409 }
        )
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        website,
        businessName: businessName || name,
        address,
        city,
        category,
        notes,
        source: 'MANUAL',
        score: 3, // Default score
        webProbability: website ? 20 : 70, // Estimate
        workspaceId,
        ownerId: session.user.id,
        stageId: defaultStage?.id,
        tags: tagIds?.length
          ? {
              createMany: {
                data: tagIds.map((tagId: string) => ({ tagId })),
              },
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        stage: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Lead creado',
        description: `Lead "${name}" creado manualmente`,
        leadId: lead.id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      ...lead,
      tags: lead.tags.map((lt) => lt.tag),
    })
  } catch (error) {
    console.error('Create lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
