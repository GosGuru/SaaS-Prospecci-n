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

    // Obtener las últimas 10 actividades
    const activities = await prisma.activity.findMany({
      where: {
        lead: {
          workspaceId
        }
      },
      include: {
        lead: {
          select: {
            name: true,
            businessName: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Formatear las actividades
    const formattedActivities = activities.map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description || '',
      leadName: activity.lead.businessName || activity.lead.name,
      createdAt: activity.createdAt.toISOString(),
      userName: activity.user.name
    }))

    return NextResponse.json(formattedActivities)

  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Error al obtener actividades' },
      { status: 500 }
    )
  }
}
