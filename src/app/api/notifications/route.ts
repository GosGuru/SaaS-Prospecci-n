import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notifications - Get user notifications
 * Query params:
 * - unreadOnly: boolean - Only return unread notifications
 * - limit: number - Max notifications to return (default 20)
 * - type: string - Filter by notification type
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')

    const where: any = {
      userId: session.user.id,
    }

    if (unreadOnly) {
      where.isRead = false
    }

    if (type) {
      where.type = type
    }

    // Try to fetch notifications, handle case where table doesn't exist yet
    try {
      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                businessName: true,
              },
            },
          },
        }),
        prisma.notification.count({
          where: {
            userId: session.user.id,
            isRead: false,
          },
        }),
      ])

      return NextResponse.json({
        notifications,
        unreadCount,
      })
    } catch (dbError: any) {
      // If table doesn't exist yet, return empty array
      if (dbError?.code === 'P2021' || dbError?.message?.includes('does not exist')) {
        console.log('[Notifications API] Table not yet created, returning empty')
        return NextResponse.json({
          notifications: [],
          unreadCount: 0,
        })
      }
      throw dbError
    }
  } catch (error) {
    console.error('[Notifications API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications - Mark notifications as read
 * Body:
 * - ids: string[] - Notification IDs to mark as read
 * - markAllRead: boolean - Mark all notifications as read
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { ids, markAllRead } = body

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.user.id, // Ensure user owns these notifications
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Provide ids array or markAllRead: true' },
        { status: 400 }
      )
    }

    // Get updated unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({ success: true, unreadCount })
  } catch (error) {
    console.error('[Notifications API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications - Delete notifications
 * Query params:
 * - id: string - Single notification ID to delete
 * Body (for batch delete):
 * - ids: string[] - Notification IDs to delete
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const singleId = searchParams.get('id')

    if (singleId) {
      await prisma.notification.deleteMany({
        where: {
          id: singleId,
          userId: session.user.id,
        },
      })
    } else {
      const body = await req.json()
      const { ids } = body

      if (!ids || !Array.isArray(ids)) {
        return NextResponse.json(
          { error: 'Provide id query param or ids array in body' },
          { status: 400 }
        )
      }

      await prisma.notification.deleteMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Notifications API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    )
  }
}
