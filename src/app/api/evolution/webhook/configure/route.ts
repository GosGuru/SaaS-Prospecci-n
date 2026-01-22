import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createEvolutionClient } from '@/lib/evolution'
import { headers } from 'next/headers'

/**
 * POST /api/evolution/webhook/configure
 * Manually configure the Evolution API webhook
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Get Evolution config from database
    const channelConfig = await prisma.channelConfig.findFirst({
      where: {
        workspaceId: membership.workspaceId,
        channel: 'WHATSAPP',
      },
    })

    if (!channelConfig) {
      return NextResponse.json(
        { error: 'WhatsApp no está configurado. Conecta Evolution API primero.' },
        { status: 400 }
      )
    }

    const config = channelConfig.config as any
    if (!config?.baseUrl || !config?.apiKey || !config?.instance) {
      return NextResponse.json(
        { error: 'Configuración de Evolution API incompleta' },
        { status: 400 }
      )
    }

    // Determine webhook URL
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/evolution/webhook`

    console.log('[Evolution Webhook Configure] URL:', webhookUrl)

    // Create client and configure webhook
    const client = createEvolutionClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      instance: config.instance,
    })

    // Get current webhook config
    const currentWebhook = await client.getWebhook()
    console.log('[Evolution Webhook Configure] Current config:', currentWebhook)

    // Set new webhook
    await client.setWebhook(webhookUrl)

    // Get updated config
    const newWebhook = await client.getWebhook()

    return NextResponse.json({
      success: true,
      message: 'Webhook configurado correctamente',
      webhookUrl,
      config: newWebhook,
    })
  } catch (error) {
    console.error('[Evolution Webhook Configure] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/evolution/webhook/configure
 * Get current webhook configuration
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Get Evolution config
    const channelConfig = await prisma.channelConfig.findFirst({
      where: {
        workspaceId: membership.workspaceId,
        channel: 'WHATSAPP',
      },
    })

    if (!channelConfig) {
      return NextResponse.json({ configured: false })
    }

    const config = channelConfig.config as any
    if (!config?.baseUrl || !config?.apiKey || !config?.instance) {
      return NextResponse.json({ configured: false })
    }

    // Create client and get webhook status
    const client = createEvolutionClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      instance: config.instance,
    })

    const webhookConfig = await client.getWebhook()

    // Determine expected URL
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const expectedUrl = `${protocol}://${host}/api/evolution/webhook`

    return NextResponse.json({
      configured: true,
      currentUrl: webhookConfig?.url || null,
      expectedUrl,
      isCorrect: webhookConfig?.url === expectedUrl,
      events: webhookConfig?.events || [],
      instance: config.instance,
    })
  } catch (error) {
    console.error('[Evolution Webhook Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get webhook status' },
      { status: 500 }
    )
  }
}
