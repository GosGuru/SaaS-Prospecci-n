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

    // Obtener tareas pendientes
    const tasks = await prisma.task.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        },
        OR: [
          // Tareas asignadas al usuario
          { assigneeId: user.id },
          // Tareas sin asignar en leads del workspace
          {
            assigneeId: null,
            lead: {
              workspaceId
            }
          }
        ]
      },
      include: {
        lead: {
          select: {
            name: true,
            businessName: true
          }
        },
        assignee: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ],
      take: 10
    })

    // Formatear las tareas
    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate?.toISOString() || null,
      priority: task.priority,
      status: task.status,
      leadName: task.lead ? (task.lead.businessName || task.lead.name) : null,
      assigneeName: task.assignee?.name || null
    }))

    return NextResponse.json(formattedTasks)

  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Error al obtener tareas' },
      { status: 500 }
    )
  }
}
