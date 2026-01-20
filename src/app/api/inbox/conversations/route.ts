import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get user and workspace
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
    const { searchParams } = new URL(req.url)
    const channel = searchParams.get('channel') // 'whatsapp', 'email', or null (all)
    const search = searchParams.get('search')

    // Get all leads that have messages (inbound or outbound)
    const leads = await prisma.lead.findMany({
      where: {
        workspaceId,
        AND: [
          {
            OR: [
              { inboundMessages: { some: {} } },
              { outboundMessages: { some: {} } }
            ]
          },
          // Filter by channel if specified
          channel ? {
            OR: [
              { inboundMessages: { some: { channel: channel.toUpperCase() as any } } },
              { outboundMessages: { some: { channel: channel.toUpperCase() as any } } }
            ]
          } : {},
          // Search filter
          search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { businessName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } }
            ]
          } : {}
        ]
      },
      include: {
        inboundMessages: {
          orderBy: { receivedAt: 'desc' },
          take: 1
        },
        outboundMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            inboundMessages: true,
            outboundMessages: true
          }
        }
      }
    })

    // Transform to conversations
    const conversations = leads.map((lead: any) => {
      const lastInbound = lead.inboundMessages[0]
      const lastOutbound = lead.outboundMessages[0]
      
      // Determine which message is more recent
      let lastMessage = ''
      let lastMessageAt = new Date(0)
      let lastMessageChannel: 'WHATSAPP' | 'EMAIL' = 'EMAIL'
      let isLastMessageInbound = false
      
      if (lastInbound && lastOutbound) {
        const inboundDate = new Date(lastInbound.receivedAt)
        const outboundDate = new Date(lastOutbound.createdAt)
        
        if (inboundDate > outboundDate) {
          lastMessage = lastInbound.content
          lastMessageAt = inboundDate
          lastMessageChannel = lastInbound.channel
          isLastMessageInbound = true
        } else {
          lastMessage = lastOutbound.content
          lastMessageAt = outboundDate
          lastMessageChannel = lastOutbound.channel
          isLastMessageInbound = false
        }
      } else if (lastInbound) {
        lastMessage = lastInbound.content
        lastMessageAt = new Date(lastInbound.receivedAt)
        lastMessageChannel = lastInbound.channel
        isLastMessageInbound = true
      } else if (lastOutbound) {
        lastMessage = lastOutbound.content
        lastMessageAt = new Date(lastOutbound.createdAt)
        lastMessageChannel = lastOutbound.channel
        isLastMessageInbound = false
      }

      // Check if last inbound message is unread
      const isRead = lastInbound && isLastMessageInbound ? !!lastInbound.readAt : true

      // Count unread messages
      const unreadCount = lead.inboundMessages.filter((msg: any) => !msg.readAt).length

      // Determine conversation channel(s)
      const hasWhatsApp = lead.inboundMessages.some((m: any) => m.channel === 'WHATSAPP') || 
                          lead.outboundMessages.some((m: any) => m.channel === 'WHATSAPP')
      const hasEmail = lead.inboundMessages.some((m: any) => m.channel === 'EMAIL') || 
                       lead.outboundMessages.some((m: any) => m.channel === 'EMAIL')
      
      let conversationChannel: 'whatsapp' | 'email' | 'both' = 'email'
      if (hasWhatsApp && hasEmail) {
        conversationChannel = 'both'
      } else if (hasWhatsApp) {
        conversationChannel = 'whatsapp'
      }

      return {
        id: lead.id,
        lead: {
          id: lead.id,
          name: lead.name,
          businessName: lead.businessName,
          email: lead.email,
          phone: lead.phone,
          avatar: lead.image || null
        },
        channel: conversationChannel,
        lastMessage: lastMessage.substring(0, 100), // Truncate for preview
        lastMessageAt: lastMessageAt.toISOString(),
        lastMessageChannel: lastMessageChannel.toLowerCase(),
        isRead,
        messageCount: lead._count.inboundMessages + lead._count.outboundMessages,
        unreadCount
      }
    })

    // Sort by most recent message first
    conversations.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )

    return NextResponse.json(conversations)

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Error al obtener conversaciones' },
      { status: 500 }
    )
  }
}
