import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createEvolutionClient, getDefaultEvolutionClient } from '@/lib/evolution'

async function getUserWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  })
  return membership?.workspace
}

export async function GET(_: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(session.user.id)
    if (!workspace) {
      console.log('[Evolution Status] No workspace found')
      return NextResponse.json({ connected: false, message: 'No workspace' })
    }

    const channelConfig = await prisma.channelConfig.findUnique({
      where: {
        workspaceId_channel: {
          workspaceId: workspace.id,
          channel: 'WHATSAPP',
        },
      },
    })

    if (!channelConfig?.config) {
      console.log('[Evolution Status] No config found')
      return NextResponse.json({ connected: false, message: 'No config found' })
    }

    const config = channelConfig.config as any
    
    // Check if it's Evolution provider
    if (config.provider !== 'evolution') {
      console.log('[Evolution Status] Not Evolution provider:', config.provider)
      return NextResponse.json({ connected: false, message: 'Not Evolution provider' })
    }

    if (!config.baseUrl || !config.apiKey || !config.instance) {
      console.log('[Evolution Status] Missing config fields')
      return NextResponse.json({ 
        connected: false, 
        message: 'Configuración incompleta',
        config: { 
          hasBaseUrl: !!config.baseUrl, 
          hasApiKey: !!config.apiKey, 
          hasInstance: !!config.instance 
        }
      })
    }

    // Create Evolution client
    const client = createEvolutionClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      instance: config.instance,
    })

    // Get instance status
    let status
    try {
      status = await client.getInstanceStatus()
      const connected = status?.instance?.state === 'open'

      console.log('[Evolution Status]', { 
        instance: config.instance, 
        state: status?.instance?.state, 
        connected,
        baseUrl: config.baseUrl
      })

      return NextResponse.json({ 
        connected, 
        state: status?.instance?.state,
        instance: config.instance,
        baseUrl: config.baseUrl
      })
    } catch (error) {
      console.error('[Evolution Status] Error calling Evolution API:', error)
      return NextResponse.json({ 
        connected: false, 
        error: 'Error al comunicarse con Evolution API',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } catch (error) {
    console.error('[Evolution Status] General error:', error)
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}

export async function DELETE(_: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(session.user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Delete the channel config
    await prisma.channelConfig.delete({
      where: {
        workspaceId_channel: {
          workspaceId: workspace.id,
          channel: 'WHATSAPP',
        },
      },
    })

    console.log('[Evolution Status] Configuration deleted successfully')

    return NextResponse.json({ success: true, message: 'WhatsApp desconectado' })
  } catch (error) {
    console.error('[Evolution Status] Error deleting config:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al desconectar' 
    }, { status: 500 })
  }
}
