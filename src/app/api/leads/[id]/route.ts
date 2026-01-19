import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateWebProbability } from '@/lib/scoring'

// GET /api/leads/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
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
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        outboundMessages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        inboundMessages: {
          orderBy: { receivedAt: 'desc' },
          take: 50,
        },
        stageHistory: {
          orderBy: { movedAt: 'desc' },
          include: {
            toStage: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            pipelineStages: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Verify access
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: lead.workspaceId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate scoring with opportunity info
    const hasWebsite = !!lead.website
    const scoring = calculateWebProbability({
      name: lead.name,
      category: lead.category || undefined,
      types: lead.category ? [lead.category] : [],
      website: lead.website,
      hasWebsite,
      rating: lead.rating || undefined,
      reviewCount: lead.reviewCount || undefined,
      priceLevel: lead.priceLevel || undefined,
      photos: 0,
      isChain: false,
    })
    
    // Update webProbability if changed
    if (lead.webProbability !== scoring.total) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { webProbability: scoring.total },
      })
    }

    return NextResponse.json({
      ...lead,
      webProbability: scoring.total,
      tags: lead.tags.map((lt) => lt.tag),
      hasWebsite,
      stages: lead.workspace.pipelineStages,
      // Opportunity info
      opportunityType: scoring.opportunityType,
      redesignPotential: scoring.redesignPotential,
      redesignReason: scoring.redesignReason,
    })
  } catch (error) {
    console.error('Get lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/leads/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      email,
      phone,
      website,
      businessName,
      address,
      city,
      category,
      status,
      score,
      notes,
      stageId,
      ownerId,
      tagIds,
    } = body

    // Get current lead
    const currentLead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        stage: true,
      },
    })

    if (!currentLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Verify access
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: currentLead.workspaceId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Handle stage change
    if (stageId && stageId !== currentLead.stageId) {
      await prisma.leadStageHistory.create({
        data: {
          leadId: params.id,
          fromStageId: currentLead.stageId,
          toStageId: stageId,
        },
      })

      // Get new stage name for activity
      const newStage = await prisma.pipelineStage.findUnique({
        where: { id: stageId },
      })

      await prisma.activity.create({
        data: {
          type: 'STAGE_CHANGE',
          title: 'Cambio de etapa',
          description: `Movido de "${currentLead.stage?.name || 'Sin etapa'}" a "${newStage?.name}"`,
          metadata: {
            fromStageId: currentLead.stageId,
            toStageId: stageId,
          },
          leadId: params.id,
          userId: session.user.id,
        },
      })
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      // Remove existing tags
      await prisma.leadTag.deleteMany({
        where: { leadId: params.id },
      })

      // Add new tags
      if (tagIds.length > 0) {
        await prisma.leadTag.createMany({
          data: tagIds.map((tagId: string) => ({
            leadId: params.id,
            tagId,
          })),
        })
      }
    }

    // Update lead
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone,
        website,
        businessName,
        address,
        city,
        category,
        status,
        score,
        notes,
        stageId,
        ownerId,
        updatedAt: new Date(),
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

    return NextResponse.json({
      ...lead,
      tags: lead.tags.map((lt) => lt.tag),
    })
  } catch (error) {
    console.error('Update lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Verify access (only admin can delete)
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: lead.workspaceId,
        },
      },
    })

    if (!membership || membership.role === 'READONLY') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.lead.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
