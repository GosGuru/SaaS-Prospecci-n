/**
 * WhatsApp Number Check API
 * 
 * POST /api/whatsapp/check
 * 
 * Verifies if a phone number has WhatsApp and updates the lead record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createEvolutionClient, getDefaultEvolutionClient } from '@/lib/evolution'

interface CheckRequest {
  leadId: string
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body: CheckRequest = await req.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    // Get lead with workspace
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
    }

    // Get Evolution client (prioritize workspace config, then env vars)
    let evolutionClient = null

    // Try workspace-specific config first
    const channelConfig = await prisma.channelConfig.findUnique({
      where: {
        workspaceId_channel: {
          workspaceId: lead.workspaceId,
          channel: 'WHATSAPP',
        },
      },
    })

    if (channelConfig?.isActive && channelConfig.config) {
      const config = channelConfig.config as {
        provider?: string
        baseUrl?: string
        apiKey?: string
        instance?: string
      }

      if (config.provider === 'evolution' && config.baseUrl && config.apiKey && config.instance) {
        evolutionClient = createEvolutionClient({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          instance: config.instance,
        })
      }
    }
    
    if (!evolutionClient) {
      evolutionClient = getDefaultEvolutionClient()
    }

    if (!evolutionClient) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Configure Evolution API in Settings.' },
        { status: 503 }
      )
    }

    // Check if number has WhatsApp
    const result = await evolutionClient.checkNumberExists(lead.phone)

    // If no WhatsApp, find or create "Sin WhatsApp" stage and assign it
    let newStageId: string | null = null
    if (!result.exists) {
      // Find "Sin WhatsApp" stage in this workspace
      let sinWhatsappStage = await prisma.pipelineStage.findFirst({
        where: {
          workspaceId: lead.workspaceId,
          name: { contains: 'Sin WhatsApp', mode: 'insensitive' },
        },
      })

      // If stage doesn't exist, create it
      if (!sinWhatsappStage) {
        // Get max order to add at the end
        const maxOrderStage = await prisma.pipelineStage.findFirst({
          where: { workspaceId: lead.workspaceId },
          orderBy: { order: 'desc' },
        })
        const nextOrder = (maxOrderStage?.order ?? -1) + 1

        sinWhatsappStage = await prisma.pipelineStage.create({
          data: {
            name: 'Sin WhatsApp',
            color: '#6b7280', // Gray color
            order: nextOrder,
            workspaceId: lead.workspaceId,
          },
        })
      }

      newStageId = sinWhatsappStage.id
    }

    // Update lead with result and optionally change stage
    const previousStageId = lead.stageId
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        hasWhatsapp: result.exists,
        whatsappCheckedAt: new Date(),
        ...(newStageId && { stageId: newStageId }),
      },
    })

    // Create activity for the check
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: result.exists ? 'WhatsApp verificado ✓' : 'Sin WhatsApp ✗',
        description: result.exists 
          ? `El número ${lead.phone} tiene cuenta de WhatsApp`
          : `El número ${lead.phone} no tiene cuenta de WhatsApp`,
        metadata: {
          action: 'whatsapp_check',
          hasWhatsapp: result.exists,
          phone: lead.phone,
        },
        leadId,
        userId: session.user.id,
      },
    })

    // If stage changed, create stage change activity
    if (newStageId && previousStageId !== newStageId) {
      const newStage = await prisma.pipelineStage.findUnique({ where: { id: newStageId } })
      
      await prisma.activity.create({
        data: {
          type: 'STAGE_CHANGE',
          title: 'Etapa cambiada',
          description: `Etapa cambiada a "${newStage?.name || 'Sin WhatsApp'}" (automático por verificación WhatsApp)`,
          metadata: {
            fromStageId: previousStageId,
            toStageId: newStageId,
            automatic: true,
            reason: 'no_whatsapp',
          },
          leadId,
          userId: session.user.id,
        },
      })

      // Record stage history
      await prisma.leadStageHistory.create({
        data: {
          leadId,
          toStageId: newStageId,
          movedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      hasWhatsapp: result.exists,
      jid: result.jid,
      phone: lead.phone,
      checkedAt: new Date().toISOString(),
      stageChanged: !!newStageId && previousStageId !== newStageId,
    })

  } catch (error: unknown) {
    console.error('[WhatsApp Check] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error checking WhatsApp'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
