import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { GmailClient, replaceTemplateVariables } from '@/lib/gmail'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { leadId, subject, message, workspaceId } = body

    if (!leadId || !subject || !message) {
      return NextResponse.json(
        { error: 'Lead ID, subject, and message are required' },
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

    if (!lead.email) {
      return NextResponse.json(
        { error: 'Lead does not have an email address' },
        { status: 400 }
      )
    }

    // Replace template variables
    const variables = {
      name: lead.name,
      businessName: lead.businessName || lead.name,
      category: lead.category || '',
      city: lead.city || '',
      address: lead.address || '',
      phone: lead.phone || '',
      email: lead.email || '',
      website: lead.website || '',
      rating: lead.rating?.toString() || '',
    }

    const processedSubject = replaceTemplateVariables(subject, variables)
    const processedMessage = replaceTemplateVariables(message, variables)

    // Demo mode - simulate sending
    if (DEMO_MODE) {
      const outboundMessage = await prisma.outboundMessage.create({
        data: {
          channel: 'EMAIL',
          to: lead.email,
          subject: processedSubject,
          content: processedMessage,
          status: 'SENT',
          sentAt: new Date(),
          providerMsgId: `demo_email_${Date.now()}`,
          leadId,
        },
      })

      await prisma.activity.create({
        data: {
          type: 'EMAIL',
          title: 'Email enviado (demo)',
          description: `Asunto: ${processedSubject}`,
          metadata: {
            messageId: outboundMessage.id,
            demo: true,
          },
          leadId,
          userId: session.user.id,
        },
      })

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

    // Get OAuth tokens for workspace
    const oauthToken = await prisma.oAuthToken.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: workspaceId || lead.workspaceId,
          provider: 'google',
        },
      },
    })

    if (!oauthToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Set up Gmail OAuth in settings.' },
        { status: 400 }
      )
    }

    // Create pending message
    const outboundMessage = await prisma.outboundMessage.create({
      data: {
        channel: 'EMAIL',
        to: lead.email,
        subject: processedSubject,
        content: processedMessage,
        status: 'PENDING',
        leadId,
      },
    })

    try {
      // Create Gmail client
      const gmailClient = new GmailClient({
        accessToken: oauthToken.accessToken,
        refreshToken: oauthToken.refreshToken || undefined,
      })

      // Send email
      const result = await gmailClient.sendEmail({
        to: lead.email,
        subject: processedSubject,
        body: processedMessage,
        isHtml: false,
      })

      // Update message
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMsgId: result.messageId,
        },
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: 'EMAIL',
          title: 'Email enviado',
          description: `Asunto: ${processedSubject}`,
          metadata: {
            messageId: outboundMessage.id,
            gmailMessageId: result.messageId,
            threadId: result.threadId,
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
        gmailMessageId: result.messageId,
      })
    } catch (sendError: any) {
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: sendError.message,
        },
      })

      throw sendError
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
