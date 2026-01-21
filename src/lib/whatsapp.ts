/**
 * WhatsApp Business API Integration (Meta/Facebook Official)
 * Uses the official WhatsApp Cloud API
 * 
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  businessAccountId?: string
}

export interface SendTextPayload {
  to: string
  message: string
  previewUrl?: boolean
}

export interface SendTemplatePayload {
  to: string
  templateName: string
  languageCode: string
  components?: TemplateComponent[]
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
  image?: { link: string }
  document?: { link: string; filename?: string }
  video?: { link: string }
}

export interface SendMediaPayload {
  to: string
  type: 'image' | 'video' | 'audio' | 'document'
  mediaUrl: string
  caption?: string
  filename?: string
}

export interface WhatsAppResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

export interface MessageStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{ code: number; title: string; message: string }>
}

const WHATSAPP_API_VERSION = 'v18.0'
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

export class WhatsAppClient {
  private config: WhatsAppConfig

  constructor(config: WhatsAppConfig) {
    this.config = config
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.accessToken}`,
    }
  }

  private get messagesEndpoint() {
    return `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`
  }

  /**
   * Format phone number for WhatsApp API
   * Cleans the number removing non-numeric characters
   * The number should already include the country code (e.g., 598 for Uruguay, 54 for Argentina)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters (spaces, dashes, parentheses, +, etc.)
    const cleaned = phone.replace(/\D/g, '')
    
    // WhatsApp requires full international format without +
    return cleaned
  }

  /**
   * Send a plain text message
   */
  async sendText(payload: SendTextPayload): Promise<WhatsAppResponse> {
    try {
      const formattedNumber = this.formatPhoneNumber(payload.to)

      const response = await fetch(this.messagesEndpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedNumber,
          type: 'text',
          text: {
            preview_url: payload.previewUrl ?? false,
            body: payload.message,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('WhatsApp API Error:', error)
        throw new Error(error.error?.message || `Failed to send message: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('WhatsApp API - sendText error:', error)
      throw error
    }
  }

  /**
   * Send a template message (required for first contact / business-initiated)
   */
  async sendTemplate(payload: SendTemplatePayload): Promise<WhatsAppResponse> {
    try {
      const formattedNumber = this.formatPhoneNumber(payload.to)

      const templateBody: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'template',
        template: {
          name: payload.templateName,
          language: {
            code: payload.languageCode,
          },
        },
      }

      // Add components if provided
      if (payload.components && payload.components.length > 0) {
        (templateBody.template as Record<string, unknown>).components = payload.components
      }

      const response = await fetch(this.messagesEndpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(templateBody),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('WhatsApp API Error:', error)
        throw new Error(error.error?.message || `Failed to send template: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('WhatsApp API - sendTemplate error:', error)
      throw error
    }
  }

  /**
   * Send media (image, video, audio, document)
   */
  async sendMedia(payload: SendMediaPayload): Promise<WhatsAppResponse> {
    try {
      const formattedNumber = this.formatPhoneNumber(payload.to)

      const mediaBody: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: payload.type,
      }

      // Build media object based on type
      const mediaObject: Record<string, unknown> = {
        link: payload.mediaUrl,
      }

      if (payload.caption && ['image', 'video', 'document'].includes(payload.type)) {
        mediaObject.caption = payload.caption
      }

      if (payload.filename && payload.type === 'document') {
        mediaObject.filename = payload.filename
      }

      mediaBody[payload.type] = mediaObject

      const response = await fetch(this.messagesEndpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(mediaBody),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('WhatsApp API Error:', error)
        throw new Error(error.error?.message || `Failed to send media: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('WhatsApp API - sendMedia error:', error)
      throw error
    }
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(this.messagesEndpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('WhatsApp API - markAsRead error:', error)
      return false
    }
  }

  /**
   * Get business profile information
   */
  async getBusinessProfile(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(
        `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
        {
          method: 'GET',
          headers: this.headers,
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get business profile: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('WhatsApp API - getBusinessProfile error:', error)
      throw error
    }
  }

  /**
   * Verify webhook (used for webhook setup)
   */
  static verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
    verifyToken: string
  ): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge
    }
    return null
  }

  /**
   * Parse incoming webhook payload
   */
  static parseWebhookPayload(body: Record<string, unknown>): {
    type: 'message' | 'status' | 'unknown'
    data: Record<string, unknown>
  } {
    try {
      const entry = (body.entry as Array<Record<string, unknown>>)?.[0]
      const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0]
      const value = changes?.value as Record<string, unknown>

      if (!value) {
        return { type: 'unknown', data: {} }
      }

      // Check for incoming messages
      const messages = value.messages as Array<Record<string, unknown>>
      if (messages && messages.length > 0) {
        const message = messages[0]
        const contact = (value.contacts as Array<Record<string, unknown>>)?.[0]

        return {
          type: 'message',
          data: {
            messageId: message.id,
            from: message.from,
            timestamp: message.timestamp,
            type: message.type,
            text: (message.text as Record<string, unknown>)?.body,
            contactName: (contact?.profile as Record<string, unknown>)?.name,
            phoneNumberId: (value.metadata as Record<string, unknown>)?.phone_number_id,
          },
        }
      }

      // Check for status updates
      const statuses = value.statuses as Array<Record<string, unknown>>
      if (statuses && statuses.length > 0) {
        const status = statuses[0]
        return {
          type: 'status',
          data: {
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
            recipientId: status.recipient_id,
            errors: status.errors,
          },
        }
      }

      return { type: 'unknown', data: value }
    } catch (error) {
      console.error('Error parsing webhook payload:', error)
      return { type: 'unknown', data: {} }
    }
  }
}

/**
 * Create WhatsApp client from environment variables
 */
export function getDefaultWhatsAppClient(): WhatsAppClient | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp API credentials not configured')
    return null
  }

  return new WhatsAppClient({
    phoneNumberId,
    accessToken,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  })
}

/**
 * Create WhatsApp client from custom config
 */
export function createWhatsAppClient(config: WhatsAppConfig): WhatsAppClient {
  return new WhatsAppClient(config)
}
