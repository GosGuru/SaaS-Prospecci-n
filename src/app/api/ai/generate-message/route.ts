/**
 * AI Message Generation API Endpoint
 * 
 * POST /api/ai/generate-message
 * 
 * Generates personalized WhatsApp/Email messages using DeepSeek AI
 * based on lead data and selected template.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { 
  generatePersonalizedMessage, 
  type MessageTemplate, 
  type MessageChannel 
} from '@/lib/deepseek'

interface GenerateMessageRequest {
  leadId: string
  template: MessageTemplate
  channel: MessageChannel
  customContext?: string
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body: GenerateMessageRequest = await req.json()
    const { leadId, template, channel, customContext } = body

    // Validate required fields
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    if (!template || !['presentacion', 'seguimiento', 'sin_web'].includes(template)) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    if (!channel || !['whatsapp', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    // Fetch lead with all relevant data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
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

    // Generate personalized message
    const result = await generatePersonalizedMessage({
      lead: leadData,
      template,
      channel,
      customContext,
    })

    return NextResponse.json({
      success: true,
      message: result.content,
      subject: result.subject,
      tokensUsed: result.tokensUsed,
    })

  } catch (error: unknown) {
    console.error('[AI Generate Message] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error generating message'
    
    // Check for specific error types
    if (errorMessage.includes('DEEPSEEK_API_KEY')) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
