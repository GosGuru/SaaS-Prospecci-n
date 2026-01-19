import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WhatsAppClient } from '@/lib/whatsapp'
import { MessageStatus } from '@prisma/client'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'prospecto_sas_verify_token'

/**
 * Webhook verification for Meta WhatsApp Business API
 * Meta sends a GET request to verify the webhook URL
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (!mode || !token || !challenge) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const result = WhatsAppClient.verifyWebhook(mode, token, challenge, VERIFY_TOKEN)

    if (result) {
      console.log('Webhook verified successfully')
      return new NextResponse(result, { status: 200 })
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  } catch (error) {
    console.error('Webhook verification error:', error)
    return NextResponse.json({ error: 'Verification error' }, { status: 500 })
  }
}

/**
 * Webhook endpoint for Meta WhatsApp Business API
 * Receives message status updates and incoming messages
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Log for debugging
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    // Parse the webhook payload
    const parsed = WhatsAppClient.parseWebhookPayload(body)

    switch (parsed.type) {
      case 'message':
        await handleIncomingMessage(parsed.data)
        break

      case 'status':
        await handleStatusUpdate(parsed.data)
        break

      default:
        console.log('Unknown webhook type:', parsed.type)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ success: true })
  }
}

async function handleIncomingMessage(data: Record<string, unknown>) {
  try {
    const {
      messageId,
      from,
      timestamp,
      type,
      text,
      contactName,
      phoneNumberId,
    } = data as {
      messageId: string
      from: string
      timestamp: string
      type: string
      text?: string
      contactName?: string
      phoneNumberId?: string
    }

    // Format message content based on type
    let content = ''
    switch (type) {
      case 'text':
        content = text || ''
        break
      case 'image':
        content = '[Imagen]'
        break
      case 'video':
        content = '[Video]'
        break
      case 'audio':
        content = '[Audio]'
        break
      case 'document':
        content = '[Documento]'
        break
      case 'location':
        content = '[Ubicación]'
        break
      case 'contacts':
        content = '[Contacto]'
        break
      case 'sticker':
        content = '[Sticker]'
        break
      default:
        content = `[${type}]`
    }

    // Find lead by phone (last 10 digits to handle different formats)
    const phoneClean = from.replace(/\D/g, '')
    const lead = await prisma.lead.findFirst({
      where: {
        phone: {
          contains: phoneClean.slice(-10),
        },
      },
    })

    // Create inbound message
    await prisma.inboundMessage.create({
      data: {
        channel: 'WHATSAPP',
        from: from,
        content,
        providerMsgId: messageId,
        metadata: {
          contactName,
          phoneNumberId,
          type,
          timestamp,
        },
        receivedAt: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date(),
        leadId: lead?.id,
      },
    })

    // Create activity if lead exists
    if (lead) {
      await prisma.activity.create({
        data: {
          type: 'WHATSAPP',
          title: 'WhatsApp recibido',
          description: content.substring(0, 200),
          metadata: {
            from,
            contactName,
            providerMsgId: messageId,
          },
          leadId: lead.id,
          userId: lead.ownerId || 'system',
        },
      })

      // Update lead last contacted
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date() },
      })
    }

    console.log(`Incoming WhatsApp from ${from} (${contactName}): ${content.substring(0, 50)}`)
  } catch (error) {
    console.error('Error handling incoming message:', error)
  }
}

async function handleStatusUpdate(data: Record<string, unknown>) {
  try {
    const { messageId, status, timestamp, recipientId, errors } = data as {
      messageId: string
      status: string
      timestamp: string
      recipientId: string
      errors?: Array<{ code: number; title: string; message: string }>
    }

    // Find outbound message by provider ID
    const outboundMessage = await prisma.outboundMessage.findFirst({
      where: { providerMsgId: messageId },
    })

    if (!outboundMessage) {
      console.log(`Message not found for provider ID: ${messageId}`)
      return
    }

    // Map Meta status to our status
    const statusMap: Record<string, MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    }

    const newStatus = statusMap[status] || MessageStatus.SENT

    // Update message status
    await prisma.outboundMessage.update({
      where: { id: outboundMessage.id },
      data: {
        status: newStatus,
        ...(newStatus === MessageStatus.DELIVERED && { deliveredAt: new Date(parseInt(timestamp) * 1000) }),
        ...(newStatus === MessageStatus.READ && { readAt: new Date(parseInt(timestamp) * 1000) }),
        ...(newStatus === MessageStatus.FAILED && { 
          failedAt: new Date(),
          errorMessage: errors?.[0]?.message || 'Unknown error',
        }),
      },
    })

    // Create status event
    await prisma.messageStatusEvent.create({
      data: {
        messageId: outboundMessage.id,
        status: newStatus,
        metadata: {
          timestamp,
          recipientId,
          errors,
        },
      },
    })

    console.log(`Message ${messageId} status updated: ${status}`)
  } catch (error) {
    console.error('Error handling status update:', error)
  }
}
