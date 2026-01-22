/**
 * AI Reply Generation API Endpoint
 * 
 * POST /api/ai/generate-reply
 * 
 * Generates personalized reply messages using DeepSeek AI
 * based on conversation history and lead data.
 * 
 * Unlike generate-message (cold outreach), this endpoint:
 * - Takes conversation history as context
 * - Uses a prompt designed for ongoing conversations (not cold messages)
 * - Supports different reply tones: amigable, profesional, cerrar_cita
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { 
  generateReplyMessage, 
  type ReplyTone, 
  type MessageChannel 
} from '@/lib/deepseek'

interface GenerateReplyRequest {
  leadId: string
  tone: ReplyTone
  channel: MessageChannel
  customContext?: string
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user workspace
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        }
      }
    })

    if (!user || !user.memberships[0]) {
      return NextResponse.json({ error: 'No workspace encontrado' }, { status: 404 })
    }

    const workspaceId = user.memberships[0].workspaceId

    // Parse request
    const body: GenerateReplyRequest = await req.json()
    const { leadId, tone, channel, customContext } = body

    // Validate required fields
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    if (!tone || !['amigable', 'profesional', 'cerrar_cita'].includes(tone)) {
      return NextResponse.json({ error: 'Invalid tone type. Must be: amigable, profesional, or cerrar_cita' }, { status: 400 })
    }

    if (!channel || !['whatsapp', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    // Fetch lead with all relevant data
    const lead = await prisma.lead.findFirst({
      where: { 
        id: leadId,
        workspaceId 
      },
      include: {
        tags: {
          include: { tag: true }
        },
        stage: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get all messages (inbound and outbound)
    const [inboundMessages, outboundMessages] = await Promise.all([
      prisma.inboundMessage.findMany({
        where: { leadId },
        orderBy: { receivedAt: 'asc' }
      }),
      prisma.outboundMessage.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' }
      })
    ])

    // Merge and sort chronologically
    const allMessages = [
      ...inboundMessages.map((msg) => ({
        type: 'inbound' as const,
        content: msg.content,
        timestamp: msg.receivedAt,
      })),
      ...outboundMessages.map((msg) => ({
        type: 'outbound' as const,
        content: msg.content,
        timestamp: msg.createdAt,
      }))
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Get client messages that need a reply:
    // Find the last outbound message and get all inbound messages after it
    // If there's no outbound message, use the last 5-10 inbound messages
    let clientMessages: string[] = []
    
    const lastOutboundIndex = allMessages
      .map((m, i) => ({ ...m, index: i }))
      .filter(m => m.type === 'outbound')
      .pop()?.index ?? -1

    if (lastOutboundIndex >= 0) {
      // Get all inbound messages after the last outbound
      clientMessages = allMessages
        .slice(lastOutboundIndex + 1)
        .filter(m => m.type === 'inbound')
        .map(m => m.content)
    } else {
      // No outbound messages yet - use last 10 inbound messages
      clientMessages = allMessages
        .filter(m => m.type === 'inbound')
        .slice(-10)
        .map(m => m.content)
    }

    if (clientMessages.length === 0) {
      return NextResponse.json({ 
        error: 'No hay mensajes del cliente para responder' 
      }, { status: 400 })
    }

    // Transform Prisma lead to match our Lead interface
    const leadData = {
      id: lead.id,
      name: lead.name,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      website: lead.website ?? undefined,
      businessName: lead.businessName ?? undefined,
      address: lead.address ?? undefined,
      city: lead.city ?? undefined,
      category: lead.category ?? undefined,
      rating: lead.rating ?? undefined,
      reviewCount: lead.reviewCount ?? undefined,
      status: lead.status,
      score: lead.score ?? undefined,
      webProbability: lead.webProbability ?? undefined,
      source: lead.source ?? undefined,
      notes: lead.notes ?? undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      lastContactedAt: lead.lastContactedAt ?? undefined,
      workspaceId: lead.workspaceId,
      tags: lead.tags?.map(lt => lt.tag) ?? undefined,
      stage: lead.stage ?? undefined,
    }

    // Build conversation context for AI
    // Include last few messages for context (max 5 from each side)
    const recentMessages = allMessages.slice(-10)
    const conversationHistory = recentMessages
      .map(m => `[${m.type === 'inbound' ? 'Cliente' : 'Tú'}]: ${m.content}`)
      .join('\n')

    // Generate personalized reply
    const result = await generateReplyMessage({
      lead: leadData,
      tone,
      channel,
      clientMessages,
      conversationHistory,
      customContext,
    })

    return NextResponse.json({
      success: true,
      message: result.content,
      subject: result.subject,
      tokensUsed: result.tokensUsed,
    })

  } catch (error: unknown) {
    console.error('[AI Generate Reply] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error generating reply'
    
    // Check for specific error types
    if (errorMessage.includes('DEEPSEEK_API_KEY')) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
