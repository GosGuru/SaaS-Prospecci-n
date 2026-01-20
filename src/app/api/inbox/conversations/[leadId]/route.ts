import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { leadId } = await props.params

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

    // Verify lead belongs to workspace
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    // Get all messages (inbound and outbound)
    const [inboundMessages, outboundMessages] = await Promise.all([
      prisma.inboundMessage.findMany({
        where: { leadId },
        orderBy: { receivedAt: 'asc' }
      }),
      prisma.outboundMessage.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' },
        include: {
          statusEvents: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      })
    ])

    // Merge and sort chronologically
    const messages = [
      ...inboundMessages.map((msg: any) => ({
        id: msg.id,
        type: 'inbound' as const,
        channel: msg.channel.toLowerCase(),
        content: msg.content,
        subject: msg.subject,
        timestamp: msg.receivedAt.toISOString(),
        from: msg.from,
        isRead: !!msg.readAt,
        metadata: msg.metadata,
        providerMsgId: msg.providerMsgId
      })),
      ...outboundMessages.map((msg: any) => ({
        id: msg.id,
        type: 'outbound' as const,
        channel: msg.channel.toLowerCase(),
        content: msg.content,
        subject: msg.subject,
        timestamp: msg.createdAt.toISOString(),
        to: msg.to,
        status: msg.status,
        sentAt: msg.sentAt?.toISOString(),
        deliveredAt: msg.deliveredAt?.toISOString(),
        readAt: msg.readAt?.toISOString(),
        failedAt: msg.failedAt?.toISOString(),
        errorMessage: msg.errorMessage,
        metadata: msg.metadata,
        providerMsgId: msg.providerMsgId
      }))
    ].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return NextResponse.json({
      leadId,
      lead: {
        id: lead.id,
        name: lead.name,
        businessName: lead.businessName,
        email: lead.email,
        phone: lead.phone
      },
      messages
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Error al obtener mensajes' },
      { status: 500 }
    )
  }
}

// PATCH - Mark conversation as read
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { leadId } = await props.params
    const body = await req.json()
    const { action } = body // 'mark_read', 'archive', 'unarchive'

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

    // Verify lead belongs to workspace
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    if (action === 'mark_read') {
      // Mark all unread inbound messages as read
      await prisma.inboundMessage.updateMany({
        where: {
          leadId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      })

      return NextResponse.json({ success: true, action: 'marked_read' })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Error al actualizar conversación' },
      { status: 500 }
    )
  }
}
