import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createEvolutionClient } from '@/lib/evolution'
import { headers } from 'next/headers'

async function getUserWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  })
  return membership?.workspace
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const serverUrl = body?.serverUrl as string | undefined
    const apiKey = body?.apiKey as string | undefined
    const instanceName = body?.instanceName as string | undefined

    if (!serverUrl || !apiKey || !instanceName) {
      return NextResponse.json(
        { error: 'serverUrl, apiKey e instanceName son obligatorios' },
        { status: 400 }
      )
    }

    const workspace = await getUserWorkspace(session.user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    console.log('[Evolution Connect] Creating client for instance:', instanceName)

    const client = createEvolutionClient({
      baseUrl: serverUrl,
      apiKey,
      instance: instanceName,
    })

    // First, check if instance is already connected
    console.log('[Evolution Connect] Checking instance status...')
    let status
    try {
      status = await client.getInstanceStatus()
      console.log('[Evolution Connect] Instance status:', status)
    } catch (error) {
      console.error('[Evolution Connect] Error checking status:', error)
      return NextResponse.json({ 
        error: 'No se pudo conectar con Evolution API. Verificá las credenciales.' 
      }, { status: 500 })
    }

    // Determine webhook URL - use the app's base URL
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/evolution/webhook`
    
    console.log('[Evolution Connect] Configuring webhook:', webhookUrl)

    // Configure webhook for incoming messages
    try {
      await client.setWebhook(webhookUrl)
      console.log('[Evolution Connect] Webhook configured successfully')
    } catch (error) {
      console.error('[Evolution Connect] Error configuring webhook:', error)
      // Don't fail the connection, just log the error
    }

    // Save config to database
    await prisma.channelConfig.upsert({
      where: {
        workspaceId_channel: {
          workspaceId: workspace.id,
          channel: 'WHATSAPP',
        },
      },
      update: {
        isActive: true,
        config: {
          provider: 'evolution',
          baseUrl: serverUrl,
          apiKey,
          instance: instanceName,
        },
      },
      create: {
        workspaceId: workspace.id,
        channel: 'WHATSAPP',
        isActive: true,
        config: {
          provider: 'evolution',
          baseUrl: serverUrl,
          apiKey,
          instance: instanceName,
        },
      },
    })

    console.log('[Evolution Connect] Config saved to database')

    // If already connected, return success without QR
    if (status?.instance?.state === 'open') {
      console.log('[Evolution Connect] Instance already connected!')
      return NextResponse.json({ 
        alreadyConnected: true, 
        message: 'La instancia ya está conectada a WhatsApp' 
      })
    }

    // If not connected, generate QR
    console.log('[Evolution Connect] Getting QR code...')
    let qr
    try {
      qr = await client.getQRCode()
      console.log('[Evolution Connect] QR received:', qr.code ? 'Success' : 'Failed')
    } catch (error) {
      console.error('[Evolution Connect] Error getting QR:', error)
      return NextResponse.json({ 
        error: 'No se pudo generar el QR. Verificá que la instancia esté creada en Evolution.' 
      }, { status: 500 })
    }

    return NextResponse.json({ qrCode: qr.base64, code: qr.code })
  } catch (error) {
    console.error('[Evolution Connect] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
