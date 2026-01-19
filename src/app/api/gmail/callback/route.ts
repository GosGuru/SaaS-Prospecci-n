import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

// GET /api/gmail/callback - Handle Google OAuth callback
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User ID
    const error = searchParams.get('error')

    if (error) {
      console.error('Gmail OAuth error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail=error&message=' + encodeURIComponent(error), req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail=error&message=missing_params', req.url)
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/gmail/callback`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail=error&message=no_token', req.url)
      )
    }

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: state },
    })

    if (!membership) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail=error&message=no_workspace', req.url)
      )
    }

    // Save OAuth token
    await prisma.oAuthToken.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: membership.workspaceId,
          provider: 'google',
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
      },
      create: {
        workspaceId: membership.workspaceId,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
      },
    })

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL('/dashboard/settings?gmail=success', req.url)
    )
  } catch (error: any) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?gmail=error&message=' + encodeURIComponent(error.message || 'unknown'), req.url)
    )
  }
}
