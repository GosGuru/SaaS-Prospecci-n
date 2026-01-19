import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultWhatsAppClient, createWhatsAppClient, WhatsAppClient } from '@/lib/whatsapp'
import { replaceTemplateVariables } from '@/lib/gmail'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { leadId, message, templateName, workspaceId } = body

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
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

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

    // Try workspace-specific config first
    if (workspaceId) {
      const channelConfig = await prisma.channelConfig.findUnique({
        where: {
          workspaceId_channel: {
            workspaceId,
            channel: 'WHATSAPP',
          },
        },
      })

      if (channelConfig?.isActive && channelConfig.config) {
        const config = channelConfig.config as {
          phoneNumberId: string
          accessToken: string
          businessAccountId?: string
        }
        whatsappClient = createWhatsAppClient({
          phoneNumberId: config.phoneNumberId,
          accessToken: config.accessToken,
          businessAccountId: config.businessAccountId,
        })
      }
    }

    // Fall back to default config
    if (!whatsappClient) {
      whatsappClient = getDefaultWhatsAppClient()
    }

    if (!whatsappClient) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Set up WhatsApp Business API in settings.' },
        { status: 400 }
      )
    }

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

      const messageId = result.messages?.[0]?.id

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
        waId: result.contacts?.[0]?.wa_id,
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
    console.error('WhatsApp send error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send WhatsApp message'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
