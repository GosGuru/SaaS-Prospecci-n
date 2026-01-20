import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Evolution API Webhook
 * Receives incoming messages and events from Evolution API
 * 
 * Configure this webhook in Evolution API Manager:
 * URL: https://your-domain.com/api/evolution/webhook
 * Events: messages.upsert, messages.update
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Evolution Webhook] Event received:', JSON.stringify(body, null, 2))

    const { event, instance, data } = body

    // Handle different event types
    if (event === 'messages.upsert') {
      return await handleMessageUpsert(data, instance)
    } else if (event === 'messages.update') {
      return await handleMessageUpdate(data, instance)
    } else if (event === 'connection.update') {
      console.log('[Evolution Webhook] Connection update:', data)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('[Evolution Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleMessageUpsert(data: any, instance: string) {
  try {
    const message = data.messages?.[0]
    if (!message) return NextResponse.json({ success: true })

    const { key, message: messageData, messageTimestamp } = message
    const { remoteJid, fromMe, id: messageId } = key

    // Extract phone number (remove @s.whatsapp.net)
    const phoneNumber = remoteJid.replace('@s.whatsapp.net', '')

    console.log('[Evolution Webhook] Processing message:', {
      messageId,
      phoneNumber,
      fromMe,
      instance
    })

    // Find workspace by Evolution instance
    const channelConfig = await prisma.channelConfig.findFirst({
      where: {
        channel: 'WHATSAPP',
        config: {
          path: ['instance'],
          equals: instance
        }
      },
      include: { workspace: true }
    })

    if (!channelConfig) {
      console.log('[Evolution Webhook] No workspace found for instance:', instance)
      return NextResponse.json({ success: true })
    }

    // Find or create lead by phone
    let lead = await prisma.lead.findFirst({
      where: {
        phone: phoneNumber,
        workspaceId: channelConfig.workspaceId
      }
    })

    if (!lead) {
      // Create lead from unknown contact
      lead = await prisma.lead.create({
        data: {
          name: phoneNumber,
          phone: phoneNumber,
          status: 'NEW',
          workspaceId: channelConfig.workspaceId,
        }
      })
      console.log('[Evolution Webhook] Created new lead:', lead.id)
    }

    // Extract message content
    let content = ''
    if (messageData.conversation) {
      content = messageData.conversation
    } else if (messageData.extendedTextMessage?.text) {
      content = messageData.extendedTextMessage.text
    } else if (messageData.imageMessage?.caption) {
      content = `[Imagen] ${messageData.imageMessage.caption}`
    } else if (messageData.videoMessage?.caption) {
      content = `[Video] ${messageData.videoMessage.caption}`
    } else if (messageData.documentMessage) {
      content = `[Documento] ${messageData.documentMessage.fileName || 'archivo'}`
    } else if (messageData.audioMessage) {
      content = '[Audio]'
    } else {
      content = '[Mensaje multimedia]'
    }

    const timestamp = new Date(parseInt(messageTimestamp) * 1000)

    if (fromMe) {
      // Outbound message - check if we already have it
      const existing = await prisma.outboundMessage.findFirst({
        where: { providerMsgId: messageId }
      })

      if (!existing) {
        await prisma.outboundMessage.create({
          data: {
            channel: 'WHATSAPP',
            to: phoneNumber,
            content,
            status: 'SENT',
            sentAt: timestamp,
            providerMsgId: messageId,
            leadId: lead.id,
          }
        })
        console.log('[Evolution Webhook] Created outbound message')
      }
    } else {
      // Inbound message
      const existing = await prisma.inboundMessage.findFirst({
        where: { providerMsgId: messageId }
      })

      if (!existing) {
        await prisma.inboundMessage.create({
          data: {
            channel: 'WHATSAPP',
            from: phoneNumber,
            content,
            receivedAt: timestamp,
            providerMsgId: messageId,
            leadId: lead.id,
          }
        })

        // Create activity (find workspace member as userId)
        const workspaceMember = await prisma.workspaceMember.findFirst({
          where: { 
            workspaceId: channelConfig.workspaceId,
          },
          orderBy: { createdAt: 'asc' } // Get first member
        })

        if (workspaceMember) {
          await prisma.activity.create({
            data: {
              type: 'WHATSAPP',
              title: 'Mensaje de WhatsApp recibido',
              description: content.substring(0, 200),
              metadata: {
                messageId,
                from: phoneNumber,
              },
              leadId: lead.id,
              userId: workspaceMember.userId,
            }
          })
        }

        console.log('[Evolution Webhook] Created inbound message and activity')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Evolution Webhook] Message upsert error:', error)
    throw error
  }
}

async function handleMessageUpdate(data: any, instance: string) {
  try {
    const update = data[0]
    if (!update) return NextResponse.json({ success: true })

    const { key, update: statusUpdate } = update
    const { id: messageId } = key

    console.log('[Evolution Webhook] Status update:', {
      messageId,
      status: statusUpdate.status
    })

    // Find outbound message
    const message = await prisma.outboundMessage.findFirst({
      where: { providerMsgId: messageId }
    })

    if (!message) {
      console.log('[Evolution Webhook] Message not found:', messageId)
      return NextResponse.json({ success: true })
    }

    // Update message status
    const status = statusUpdate.status
    const updateData: any = {}

    if (status === 'SERVER_ACK' || status === 'DELIVERY_ACK') {
      updateData.status = 'DELIVERED'
      updateData.deliveredAt = new Date()
    } else if (status === 'READ') {
      updateData.status = 'READ'
      updateData.readAt = new Date()
    } else if (status === 'PENDING') {
      updateData.status = 'PENDING'
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: updateData
      })

      // Create status event
      await prisma.messageStatusEvent.create({
        data: {
          messageId: message.id,
          status: updateData.status || 'UNKNOWN',
          metadata: statusUpdate
        }
      })

      console.log('[Evolution Webhook] Updated message status to:', updateData.status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Evolution Webhook] Message update error:', error)
    throw error
  }
}

// GET method for webhook verification (if needed)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge = searchParams.get('hub.challenge')
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ status: 'Evolution webhook active' })
}
