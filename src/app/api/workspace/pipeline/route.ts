/**
 * Pipeline Stages API
 * 
 * GET /api/workspace/pipeline - Get all pipeline stages for the workspace
 * PUT /api/workspace/pipeline - Update all pipeline stages (create, update, delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all pipeline stages for the user's workspace
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: {
        workspace: {
          include: {
            pipelineStages: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!membership?.workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json({
      workspaceId: membership.workspace.id,
      stages: membership.workspace.pipelineStages,
    })
  } catch (error) {
    console.error('[Pipeline GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline stages' },
      { status: 500 }
    )
  }
}

// PUT - Update all pipeline stages
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
    })

    if (!membership?.workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if user has permission to edit
    if (membership.role === 'READONLY') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const workspaceId = membership.workspace.id
    const body = await req.json()
    const { stages } = body as { stages: { id?: string; name: string; color: string; order: number }[] }

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: 'stages array is required' }, { status: 400 })
    }

    // Get existing stages
    const existingStages = await prisma.pipelineStage.findMany({
      where: { workspaceId },
    })

    const existingIds = existingStages.map((s) => s.id)
    const newStageIds = stages.filter((s) => s.id).map((s) => s.id!)

    // Determine which stages to delete (exist in DB but not in request)
    const stagesToDelete = existingIds.filter((id) => !newStageIds.includes(id))

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Delete removed stages
      if (stagesToDelete.length > 0) {
        // First, unset stageId from any leads that have these stages
        await tx.lead.updateMany({
          where: { stageId: { in: stagesToDelete } },
          data: { stageId: null },
        })

        await tx.pipelineStage.deleteMany({
          where: { id: { in: stagesToDelete } },
        })
      }

      // Upsert each stage
      const upsertedStages = await Promise.all(
        stages.map((stage, index) =>
          tx.pipelineStage.upsert({
            where: { id: stage.id || `new-${index}-${Date.now()}` },
            create: {
              name: stage.name,
              color: stage.color,
              order: stage.order,
              workspaceId,
            },
            update: {
              name: stage.name,
              color: stage.color,
              order: stage.order,
            },
          })
        )
      )

      return upsertedStages
    })

    return NextResponse.json({
      success: true,
      stages: result,
    })
  } catch (error) {
    console.error('[Pipeline PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update pipeline stages' },
      { status: 500 }
    )
  }
}
