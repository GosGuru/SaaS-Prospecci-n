import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultWhatsAppClient, createWhatsAppClient, WhatsAppClient } from '@/lib/whatsapp'
import { createEvolutionClient, getDefaultEvolutionClient } from '@/lib/evolution'
import { replaceTemplateVariables } from '@/lib/gmail'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export async function POST(req: NextRequest) {
  console.log('[WhatsApp Send] Request received, DEMO_MODE:', DEMO_MODE)
  
  try {
    const session = await auth()
    if (!session?.user) {
      console.log('[WhatsApp Send] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    let { leadId, message, templateName, workspaceId } = body
    console.log('[WhatsApp Send] Body:', { leadId, hasMessage: !!message, templateName, workspaceId })

    if (!leadId || (!message && !templateName)) {
      return NextResponse.json(
        { error: 'Lead ID and message or template are required' },
        { status: 400 }
      )
    }

    // Get lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      console.log('[WhatsApp Send] Lead not found:', leadId)
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // If no workspaceId provided, get it from lead
    if (!workspaceId) {
      workspaceId = lead.workspaceId
    }
    console.log('[WhatsApp Send] Using workspaceId:', workspaceId)

    if (!lead.phone) {
      return NextResponse.json(
        { error: 'Lead does not have a phone number' },
        { status: 400 }
      )
    }

    // Replace template variables in message
    const processedMessage = message ? replaceTemplateVariables(message, {
      name: lead.name,
      businessName: lead.businessName || lead.name,
      category: lead.category || '',
      city: lead.city || '',
      address: lead.address || '',
      phone: lead.phone || '',
      email: lead.email || '',
      website: lead.website || '',
      rating: lead.rating?.toString() || '',
    }) : ''

    // Demo mode - simulate sending
    if (DEMO_MODE) {
      // Create message record
      const outboundMessage = await prisma.outboundMessage.create({
        data: {
          channel: 'WHATSAPP',
          to: lead.phone,
          content: processedMessage || `[Template: ${templateName}]`,
          status: 'SENT',
          sentAt: new Date(),
          providerMsgId: `demo_${Date.now()}`,
          leadId,
        },
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: 'WHATSAPP',
          title: 'WhatsApp enviado (demo)',
          description: (processedMessage || `Template: ${templateName}`).substring(0, 200),
          metadata: {
            messageId: outboundMessage.id,
            demo: true,
          },
          leadId,
          userId: session.user.id,
        },
      })

      // Update lead last contacted
      await prisma.lead.update({
        where: { id: leadId },
        data: { lastContactedAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        messageId: outboundMessage.id,
        demo: true,
      })
    }

    // Get WhatsApp client
    let whatsappClient: WhatsAppClient | null = null
    let evolutionClient: ReturnType<typeof getDefaultEvolutionClient> = null
    let isEvolution = false

    // Try workspace-specific config first
    if (workspaceId) {
      console.log('[WhatsApp Send] Looking for ChannelConfig for workspace:', workspaceId)
      const channelConfig = await prisma.channelConfig.findUnique({
        where: {
          workspaceId_channel: {
            workspaceId,
            channel: 'WHATSAPP',
          },
        },
      })
      console.log('[WhatsApp Send] ChannelConfig found:', { 
        found: !!channelConfig, 
        isActive: channelConfig?.isActive,
        hasConfig: !!channelConfig?.config,
        provider: (channelConfig?.config as any)?.provider
      })

      if (channelConfig?.isActive && channelConfig.config) {
        const config = channelConfig.config as {
          provider?: string
          baseUrl?: string
          apiKey?: string
          instance?: string
          phoneNumberId?: string
          accessToken?: string
          businessAccountId?: string
        }

        if (config.provider === 'evolution' && config.baseUrl && config.apiKey && config.instance) {
          evolutionClient = createEvolutionClient({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            instance: config.instance,
          })
          isEvolution = true
        } else if (config.phoneNumberId && config.accessToken) {
          whatsappClient = createWhatsAppClient({
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken,
            businessAccountId: config.businessAccountId,
          })
        }
      }
    }

    // Fall back to default Evolution config from environment variables
    if (!whatsappClient && !evolutionClient) {
      evolutionClient = getDefaultEvolutionClient()
      if (evolutionClient) {
        isEvolution = true
        console.log('[WhatsApp Send] Using Evolution API from environment variables')
      }
    }

    // Fall back to default WhatsApp Meta config
    if (!whatsappClient && !evolutionClient) {
      whatsappClient = getDefaultWhatsAppClient()
      if (whatsappClient) {
        console.log('[WhatsApp Send] Using WhatsApp Meta API from environment variables')
      }
    }

    if (!whatsappClient && !evolutionClient) {
      console.error('[WhatsApp Send] No WhatsApp client configured. Check environment variables: EVOLUTION_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE')
      return NextResponse.json(
        { error: 'WhatsApp not configured. Set up Evolution API in settings or environment variables.' },
        { status: 400 }
      )
    }

    console.log('[WhatsApp Send] Sending to:', lead.phone, 'isEvolution:', isEvolution)

    // Create pending message record
    const outboundMessage = await prisma.outboundMessage.create({
      data: {
        channel: 'WHATSAPP',
        to: lead.phone,
        content: processedMessage || `[Template: ${templateName}]`,
        status: 'PENDING',
        leadId,
      },
    })

    try {
      let result

      // Send template or text message
      if (isEvolution && evolutionClient) {
        if (templateName) {
          return NextResponse.json(
            { error: 'Evolution API no soporta plantillas. Enviá texto simple.' },
            { status: 400 }
          )
        }
        result = await evolutionClient.sendText({
          number: lead.phone,
          text: processedMessage,
        })
      } else if (whatsappClient) {
        if (templateName) {
          // For first-time contact or business-initiated messages, use templates
          result = await whatsappClient.sendTemplate({
            to: lead.phone,
            templateName: templateName,
            languageCode: 'es', // Spanish by default, could be configurable
          })
        } else {
          // Send regular text message (only works within 24hr window)
          result = await whatsappClient.sendText({
            to: lead.phone,
            message: processedMessage,
          })
        }
      }

      const messageId = isEvolution
        ? (result as any)?.key?.id
        : (result as any)?.messages?.[0]?.id

      // Update message with result
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMsgId: messageId,
        },
      })

      // Create status event
      await prisma.messageStatusEvent.create({
        data: {
          messageId: outboundMessage.id,
          status: 'SENT',
          metadata: JSON.parse(JSON.stringify(result)),
        },
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: 'WHATSAPP',
          title: templateName ? 'WhatsApp template enviado' : 'WhatsApp enviado',
          description: (processedMessage || `Template: ${templateName}`).substring(0, 200),
          metadata: {
            messageId: outboundMessage.id,
            providerMsgId: messageId,
            templateName: templateName || undefined,
          },
          leadId,
          userId: session.user.id,
        },
      })

      // Update lead
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          lastContactedAt: new Date(),
          status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
        },
      })

      return NextResponse.json({
        success: true,
        messageId: outboundMessage.id,
        providerMsgId: messageId,
        waId: (result as any)?.contacts?.[0]?.wa_id,
      })
    } catch (sendError: unknown) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error'
      
      // Update message as failed
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: errorMessage,
        },
      })

      throw sendError
    }
  } catch (error: unknown) {
    console.error('[WhatsApp Send] Full error:', error)
    console.error('[WhatsApp Send] Error stack:', error instanceof Error ? error.stack : 'no stack')
    const errorMessage = error instanceof Error ? error.message : 'Failed to send WhatsApp message'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
