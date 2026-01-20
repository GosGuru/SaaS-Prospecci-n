import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function normalizeUrl(url: string) {
  try {
    const hasProtocol = /^https?:\/\//i.test(url)
    return hasProtocol ? url : `https://${url}`
  } catch {
    return url
  }
}

function extractEmails(html: string) {
  const matches = html.match(EMAIL_REGEX) || []
  const unique = Array.from(new Set(matches.map((email) => email.toLowerCase())))
  return unique.filter((email) => !email.includes('example.com'))
}

async function verifyLeadAccess(userId: string, leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, email: true, website: true, workspaceId: true },
  })

  if (!lead) {
    return { error: NextResponse.json({ error: 'Lead not found' }, { status: 404 }) }
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: lead.workspaceId,
      },
    },
  })

  if (!membership) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  return { lead }
}

// GET /api/enrichment?leadId=...
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('leadId')
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const access = await verifyLeadAccess(session.user.id, leadId)
    if ('error' in access) {
      return access.error
    }

    const job = await prisma.enrichmentJob.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Enrichment status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/enrichment
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const leadId = body?.leadId as string | undefined
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const access = await verifyLeadAccess(session.user.id, leadId)
    if ('error' in access) {
      return access.error
    }

    const lead = access.lead
    if (!lead.website) {
      const job = await prisma.enrichmentJob.create({
        data: {
          leadId,
          workspaceId: lead.workspaceId,
          status: 'FAILED',
          source: 'website_scrape',
          error: 'Lead has no website to scrape',
          finishedAt: new Date(),
        },
      })

      return NextResponse.json({ job, emails: [] })
    }

    const job = await prisma.enrichmentJob.create({
      data: {
        leadId,
        workspaceId: lead.workspaceId,
        status: 'RUNNING',
        source: 'website_scrape',
        startedAt: new Date(),
      },
    })

    let emails: string[] = []
    let errorMessage: string | null = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const targetUrl = normalizeUrl(lead.website)
      const response = await fetch(targetUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`Failed to fetch website (${response.status})`)
      }

      const html = await response.text()
      emails = extractEmails(html)

      if (emails.length > 0) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            email: lead.email || emails[0],
          },
        })

        await prisma.activity.create({
          data: {
            type: 'SYSTEM',
            title: 'Email enriquecido',
            description: `Email encontrado en el sitio web: ${emails[0]}`,
            leadId,
            userId: session.user.id,
          },
        })
      } else {
        await prisma.activity.create({
          data: {
            type: 'SYSTEM',
            title: 'Enriquecimiento ejecutado',
            description: 'No se encontraron emails en el sitio web',
            leadId,
            userId: session.user.id,
          },
        })
      }
    } catch (error: any) {
      errorMessage = error?.message || 'Scraping failed'
    }

    const updatedJob = await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: errorMessage ? 'FAILED' : 'SUCCESS',
        result: { emails, source: 'website_scrape' },
        error: errorMessage,
        finishedAt: new Date(),
      },
    })

    return NextResponse.json({ job: updatedJob, emails })
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
