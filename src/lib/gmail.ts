/**
 * Gmail API Integration
 * Uses Google OAuth2 for authentication and Gmail API for sending emails
 */

import { google } from 'googleapis'

interface GmailConfig {
  accessToken: string
  refreshToken?: string
}

interface SendEmailPayload {
  to: string
  subject: string
  body: string
  isHtml?: boolean
  cc?: string
  bcc?: string
  replyTo?: string
}

interface EmailResult {
  messageId: string
  threadId: string
  labelIds: string[]
}

export class GmailClient {
  private auth: any
  private gmail: any

  constructor(config: GmailConfig) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    this.auth.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.auth })
  }

  /**
   * Send email using Gmail API
   */
  async sendEmail(payload: SendEmailPayload): Promise<EmailResult> {
    try {
      const message = this.createMessage(payload)
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      })

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds || [],
      }
    } catch (error: any) {
      console.error('Gmail API - sendEmail error:', error)
      throw new Error(error.message || 'Failed to send email')
    }
  }

  /**
   * Get user profile (email address)
   */
  async getProfile(): Promise<{ email: string; messagesTotal: number }> {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      })

      return {
        email: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
      }
    } catch (error: any) {
      console.error('Gmail API - getProfile error:', error)
      throw new Error(error.message || 'Failed to get profile')
    }
  }

  /**
   * Get messages from inbox
   */
  async getMessages(options: {
    maxResults?: number
    query?: string
    pageToken?: string
  } = {}): Promise<{
    messages: any[]
    nextPageToken?: string
  }> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: options.maxResults || 20,
        q: options.query,
        pageToken: options.pageToken,
      })

      const messages = await Promise.all(
        (response.data.messages || []).map(async (msg: any) => {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          })
          return fullMessage.data
        })
      )

      return {
        messages,
        nextPageToken: response.data.nextPageToken,
      }
    } catch (error: any) {
      console.error('Gmail API - getMessages error:', error)
      throw new Error(error.message || 'Failed to get messages')
    }
  }

  /**
   * Create MIME message
   */
  private createMessage(payload: SendEmailPayload): string {
    const boundary = 'boundary_' + Date.now().toString(16)
    const contentType = payload.isHtml ? 'text/html' : 'text/plain'

    let message = [
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      'MIME-Version: 1.0',
    ]

    if (payload.cc) {
      message.push(`Cc: ${payload.cc}`)
    }

    if (payload.bcc) {
      message.push(`Bcc: ${payload.bcc}`)
    }

    if (payload.replyTo) {
      message.push(`Reply-To: ${payload.replyTo}`)
    }

    message.push(`Content-Type: ${contentType}; charset=utf-8`)
    message.push('')
    message.push(payload.body)

    return message.join('\r\n')
  }
}

/**
 * Template variable replacement
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template

  const replacements: Record<string, string> = {
    '{nombre}': variables.name || '',
    '{negocio}': variables.businessName || variables.name || '',
    '{rubro}': variables.category || '',
    '{ciudad}': variables.city || '',
    '{zona}': variables.city || '',
    '{direccion}': variables.address || '',
    '{telefono}': variables.phone || '',
    '{email}': variables.email || '',
    '{web}': variables.website || '',
    '{rating}': variables.rating || '',
  }

  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'gi'), value)
  }

  return result
}

/**
 * Email templates
 */
export const EMAIL_TEMPLATES = {
  INTRO: {
    name: 'Presentación inicial',
    subject: 'Potenciá tu negocio con presencia digital - {negocio}',
    body: `Hola {nombre},

Me comunico desde ProspectoSAS porque noté que {negocio} tiene excelentes reseñas y una gran reputación en {ciudad}.

Actualmente ayudamos a negocios como el tuyo a:
✅ Aumentar su visibilidad online
✅ Captar más clientes desde Google
✅ Profesionalizar su imagen digital

¿Te gustaría una consulta gratuita para ver cómo podemos ayudarte?

Quedamos en contacto.

Saludos,
[Tu nombre]`,
  },
  FOLLOWUP: {
    name: 'Seguimiento',
    subject: 'Seguimiento - Oportunidad para {negocio}',
    body: `Hola {nombre},

Quería hacer un seguimiento de mi mensaje anterior sobre cómo podemos ayudar a {negocio} a crecer online.

¿Tenés unos minutos esta semana para una breve llamada?

Saludos,
[Tu nombre]`,
  },
  NO_WEBSITE: {
    name: 'Sin sitio web',
    subject: '¿{negocio} todavía sin página web?',
    body: `Hola {nombre},

Estuve buscando {rubro} en {ciudad} y encontré {negocio} con excelentes calificaciones ({rating}★).

Sin embargo, noté que no tienen una página web propia. En 2024, esto puede significar perder hasta un 70% de potenciales clientes que buscan online antes de decidir.

Podemos ayudarte a crear una presencia digital profesional a un costo muy accesible.

¿Te interesa saber más?

Saludos,
[Tu nombre]`,
  },
}

/**
 * WhatsApp message templates
 */
export const WHATSAPP_TEMPLATES = {
  INTRO: {
    name: 'Presentación WhatsApp',
    body: `¡Hola! 👋

Soy [Tu nombre] de ProspectoSAS.

Vi que *{negocio}* tiene excelentes reseñas en {ciudad} y quería preguntarte:

¿Ya tienen presencia digital profesional (web/redes)?

Ayudamos a negocios como el tuyo a captar más clientes. 🚀

¿Te gustaría saber cómo?`,
  },
  NO_WEBSITE: {
    name: 'Sin web - WhatsApp',
    body: `¡Hola {nombre}! 👋

Encontré *{negocio}* buscando {rubro} en {ciudad}.

Tienen muy buenas reseñas pero noté que no tienen web propia.

*¿Sabías que el 80% de los clientes buscan online antes de visitar un negocio?*

Podemos ayudarte a crear tu presencia digital. ¿Te interesa una propuesta sin compromiso? 📲`,
  },
  FOLLOWUP: {
    name: 'Seguimiento WhatsApp',
    body: `Hola {nombre} 👋

Te escribí hace unos días sobre crear la presencia digital de *{negocio}*.

¿Pudiste pensarlo? Seguimos a disposición para cualquier consulta.

¡Saludos! 🙌`,
  },
}
