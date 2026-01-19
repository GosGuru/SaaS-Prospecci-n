import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/gmail/status - Check Gmail connection status
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
    })

    if (!membership) {
      return NextResponse.json({
        connected: false,
        email: null,
        error: 'No workspace found',
      })
    }

    // Check for Gmail OAuth token
    const oauthToken = await prisma.oAuthToken.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: membership.workspaceId,
          provider: 'google',
        },
      },
    })

    if (!oauthToken) {
      return NextResponse.json({
        connected: false,
        email: null,
      })
    }

    // Check if token has gmail scope
    const hasGmailScope = oauthToken.scope?.includes('gmail.send')

    return NextResponse.json({
      connected: hasGmailScope,
      email: session.user.email,
      expiresAt: oauthToken.expiresAt,
      hasGmailScope,
    })
  } catch (error) {
    console.error('Gmail status error:', error)
    return NextResponse.json(
      { error: 'Failed to check Gmail status' },
      { status: 500 }
    )
  }
}

// DELETE /api/gmail/status - Disconnect Gmail
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Delete OAuth token
    await prisma.oAuthToken.deleteMany({
      where: {
        workspaceId: membership.workspaceId,
        provider: 'google',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gmail disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    )
  }
}
