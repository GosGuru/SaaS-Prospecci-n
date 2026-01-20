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

    // Fechas para comparaciones
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 1. TOTAL LEADS
    const totalLeads = await prisma.lead.count({
      where: { workspaceId }
    })

    // Leads del mes pasado para comparación
    const leadsLastMonth = await prisma.lead.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfLastMonth,
          lt: startOfThisMonth
        }
      }
    })

    const leadsThisMonth = await prisma.lead.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfThisMonth
        }
      }
    })

    const leadGrowthPercentage = leadsLastMonth > 0 
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
      : 0

    // 2. NUEVOS HOY
    const newLeadsToday = await prisma.lead.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfToday
        }
      }
    })

    const newLeadsYesterday = await prisma.lead.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday
        }
      }
    })

    const newLeadsGrowthPercentage = newLeadsYesterday > 0
      ? Math.round(((newLeadsToday - newLeadsYesterday) / newLeadsYesterday) * 100)
      : 0

    // 3. CONTACTADOS HOY
    const contactedToday = await prisma.lead.count({
      where: {
        workspaceId,
        lastContactedAt: {
          gte: startOfToday
        }
      }
    })

    // 4. GANADOS Y PERDIDOS DEL MES
    const wonStage = await prisma.pipelineStage.findFirst({
      where: {
        workspaceId,
        isWon: true
      }
    })

    const lostStage = await prisma.pipelineStage.findFirst({
      where: {
        workspaceId,
        isLost: true
      }
    })

    const wonThisMonth = wonStage ? await prisma.lead.count({
      where: {
        workspaceId,
        stageId: wonStage.id,
        updatedAt: {
          gte: startOfThisMonth
        }
      }
    }) : 0

    const lostThisMonth = lostStage ? await prisma.lead.count({
      where: {
        workspaceId,
        stageId: lostStage.id,
        updatedAt: {
          gte: startOfThisMonth
        }
      }
    }) : 0

    // 5. PIPELINE POR ETAPAS
    const stages = await prisma.pipelineStage.findMany({
      where: { workspaceId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    })

    const leadsByStage = stages.map((stage: any) => ({
      stage: stage.name,
      count: stage._count.leads,
      color: stage.color
    }))

    // 6. OUTREACH STATS - EMAIL
    const emailStats = await prisma.outboundMessage.groupBy({
      by: ['status'],
      where: {
        lead: {
          workspaceId
        },
        channel: 'EMAIL'
      },
      _count: true
    })

    const emailSent = emailStats
      .filter((s: any) => ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(s.status))
      .reduce((sum: number, s: any) => sum + s._count, 0)
    
    const emailDelivered = emailStats
      .filter((s: any) => ['DELIVERED', 'READ'].includes(s.status))
      .reduce((sum: number, s: any) => sum + s._count, 0)
    
    const emailFailed = emailStats
      .find((s: any) => s.status === 'FAILED')?._count || 0

    // 7. OUTREACH STATS - WHATSAPP (pendiente - datos vacíos por ahora)
    const whatsappStats = {
      sent: 0,
      delivered: 0,
      failed: 0
    }

    // Respuesta
    return NextResponse.json({
      totalLeads,
      leadGrowth: {
        value: leadGrowthPercentage,
        label: 'vs mes anterior'
      },
      newLeadsToday,
      newLeadsGrowth: {
        value: newLeadsGrowthPercentage,
        label: 'vs ayer'
      },
      contactedToday,
      wonThisMonth,
      lostThisMonth,
      leadsByStage,
      outreachStats: {
        whatsappSent: whatsappStats.sent,
        whatsappDelivered: whatsappStats.delivered,
        whatsappFailed: whatsappStats.failed,
        emailSent,
        emailDelivered,
        emailFailed,
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del dashboard' },
      { status: 500 }
    )
  }
}
