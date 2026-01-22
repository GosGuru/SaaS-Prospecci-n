import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Evolution API Webhook
 * Receives incoming messages and events from Evolution API
 * 
 * Configure this webhook in Evolution API Manager:
 * URL: https://your-domain.com/api/evolution/webhook
 * Events: MESSAGES_UPSERT, MESSAGES_UPDATE, CONNECTION_UPDATE
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Evolution Webhook] ========================================')
    console.log('[Evolution Webhook] Raw event received:', JSON.stringify(body, null, 2))

    // Evolution API v2 can send events in different formats:
    // Format 1: { event: "messages.upsert", instance: "...", data: {...} }
    // Format 2: { event: "MESSAGES_UPSERT", instance: {...}, data: [...] }
    // Format 3: { sender: "...", instance: "...", data: {...}, event: "..." }
    
    let event = body.event
    let instance = body.instance
    let data = body.data
    
    // Handle case where instance is an object
    if (typeof instance === 'object' && instance !== null) {
      instance = instance.instanceName || instance.name || instance.instance
    }
    
    // Handle case where sender contains instance name
    if (!instance && body.sender) {
      instance = body.sender
    }
    
    // Normalize event name (Evolution API can use different formats)
    // MESSAGES_UPSERT -> messages.upsert
    // messages.upsert -> messages.upsert
    const normalizedEvent = event?.toLowerCase().replace(/_/g, '.')

    console.log('[Evolution Webhook] Parsed - Event:', event, '-> normalized:', normalizedEvent, 'Instance:', instance)

    // Handle different event types
    if (normalizedEvent === 'messages.upsert') {
      return await handleMessageUpsert(data, instance)
    } else if (normalizedEvent === 'messages.update') {
      return await handleMessageUpdate(data, instance)
    } else if (normalizedEvent === 'connection.update') {
      console.log('[Evolution Webhook] Connection update:', data)
      return NextResponse.json({ success: true })
    } else if (normalizedEvent === 'send.message') {
      // This is triggered when WE send a message via Evolution API
      console.log('[Evolution Webhook] Send message event (ignoring - handled separately)')
      return NextResponse.json({ success: true })
    }

    console.log('[Evolution Webhook] Unhandled event type:', event)
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
    // Evolution API v2 can send data in different formats:
    // Format 1: { messages: [{ key, message, messageTimestamp }] }
    // Format 2: Array of messages directly
    // Format 3: Single message object
    
    let messages = data?.messages || data
    if (!Array.isArray(messages)) {
      messages = [messages]
    }
    
    const message = messages[0]
    if (!message) {
      console.log('[Evolution Webhook] No message in data:', JSON.stringify(data, null, 2))
      return NextResponse.json({ success: true })
    }

    console.log('[Evolution Webhook] Message object:', JSON.stringify(message, null, 2))

    const { key, message: messageData, messageTimestamp, pushName } = message
    
    if (!key) {
      console.log('[Evolution Webhook] No key in message - skipping')
      return NextResponse.json({ success: true })
    }
    
    const { remoteJid, fromMe, id: messageId } = key

    // Skip group messages (only handle direct messages)
    if (remoteJid?.includes('@g.us')) {
      console.log('[Evolution Webhook] Skipping group message')
      return NextResponse.json({ success: true })
    }

    // Extract phone number (remove @s.whatsapp.net)
    const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '') || ''
    
    // Clean phone for comparison (remove all non-numeric)
    const cleanPhone = phoneNumber.replace(/\D/g, '')

    console.log('[Evolution Webhook] Processing message:', {
      messageId,
      phoneNumber,
      cleanPhone,
      fromMe,
      instance,
      pushName,
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

    console.log('[Evolution Webhook] Found workspace:', channelConfig.workspaceId)

    // Find lead by phone - try multiple formats
    let lead = await prisma.lead.findFirst({
      where: {
        workspaceId: channelConfig.workspaceId,
        OR: [
          { phone: phoneNumber },
          { phone: `+${phoneNumber}` },
          { phone: { contains: cleanPhone.slice(-10) } }, // Last 10 digits
        ]
      }
    })

    console.log('[Evolution Webhook] Lead search result:', lead?.id || 'not found')

    if (!lead) {
      // Create lead from unknown contact
      lead = await prisma.lead.create({
        data: {
          name: `WhatsApp ${phoneNumber}`,
          phone: `+${phoneNumber}`,
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

        // Find all workspace members to notify
        const workspaceMembers = await prisma.workspaceMember.findMany({
          where: { 
            workspaceId: channelConfig.workspaceId,
          },
        })

        // Create activity and notifications for all workspace members
        for (const member of workspaceMembers) {
          // Create activity (only for first member to avoid duplicates)
          if (member === workspaceMembers[0]) {
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
                userId: member.userId,
              }
            })
          }

          // Create notification for all members
          await prisma.notification.create({
            data: {
              type: 'NEW_MESSAGE',
              title: 'Nuevo mensaje de WhatsApp',
              message: content.substring(0, 200),
              userId: member.userId,
              workspaceId: channelConfig.workspaceId,
              leadId: lead.id,
              metadata: {
                messageId,
                from: phoneNumber,
                channel: 'whatsapp',
              },
            }
          })
        }

        console.log('[Evolution Webhook] Created inbound message, activity and notifications')
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
