/**
 * Evolution API Integration
 * Supports Evolution API v2 for WhatsApp messaging
 */

import type { MessageStatus } from '@/types'

interface EvolutionConfig {
  baseUrl: string
  apiKey: string
  instance: string
}

interface SendTextPayload {
  number: string
  text: string
  linkPreview?: boolean
}

interface SendMediaPayload {
  number: string
  mediatype: 'image' | 'video' | 'audio' | 'document'
  media: string // base64 or URL
  caption?: string
  fileName?: string
}

interface EvolutionResponse {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: Record<string, any>
  messageTimestamp: number
  status: string
}

interface InstanceStatus {
  instance: {
    instanceName: string
    state: 'open' | 'close' | 'connecting'
  }
}

export class EvolutionClient {
  private config: EvolutionConfig

  constructor(config: EvolutionConfig) {
    this.config = config
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      apikey: this.config.apiKey,
    }
  }

  private get baseEndpoint() {
    return `${this.config.baseUrl}/message/sendText/${this.config.instance}`
  }

  /**
   * Check instance connection status
   */
  async getInstanceStatus(): Promise<InstanceStatus> {
    const url = `${this.config.baseUrl}/instance/connectionState/${this.config.instance}`
    console.log('[EvolutionClient] getInstanceStatus - URL:', url)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      })

      console.log('[EvolutionClient] getInstanceStatus - Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EvolutionClient] getInstanceStatus - Error response:', errorText)
        throw new Error(`Failed to get instance status (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log('[EvolutionClient] getInstanceStatus - Data:', data)
      return data
    } catch (error) {
      console.error('[EvolutionClient] getInstanceStatus - Exception:', error)
      throw error
    }
  }

  /**
   * Send plain text message
   */
  async sendText(payload: SendTextPayload): Promise<EvolutionResponse> {
    try {
      // Format phone number (remove non-numeric, ensure country code)
      const formattedNumber = this.formatPhoneNumber(payload.number)
      
      const url = `${this.config.baseUrl}/message/sendText/${this.config.instance}`
      const requestBody = {
        number: formattedNumber,
        text: payload.text,
        delay: 1200,
        linkPreview: payload.linkPreview ?? false,
      }
      
      console.log('[EvolutionClient] sendText - URL:', url)
      console.log('[EvolutionClient] sendText - Body:', JSON.stringify(requestBody))

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      })

      console.log('[EvolutionClient] sendText - Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EvolutionClient] sendText - Error response:', errorText)
        let errorMessage = `Failed to send message: ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          // Check if the error is about number not existing on WhatsApp
          if (errorJson.response?.message?.[0]?.exists === false) {
            errorMessage = `El número ${payload.number} no tiene cuenta de WhatsApp`
          } else {
            errorMessage = errorJson.message || errorJson.error || errorMessage
          }
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[EvolutionClient] sendText - Success:', result)
      return result
    } catch (error) {
      console.error('Evolution API - sendText error:', error)
      throw error
    }
  }

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMedia(payload: SendMediaPayload): Promise<EvolutionResponse> {
    try {
      const formattedNumber = this.formatPhoneNumber(payload.number)

      const response = await fetch(
        `${this.config.baseUrl}/message/sendMedia/${this.config.instance}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            number: formattedNumber,
            mediatype: payload.mediatype,
            media: payload.media,
            caption: payload.caption,
            fileName: payload.fileName,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to send media: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Evolution API - sendMedia error:', error)
      throw error
    }
  }

  /**
   * Get QR code for instance connection
   */
  async getQRCode(): Promise<{ base64: string; code: string }> {
    const url = `${this.config.baseUrl}/instance/connect/${this.config.instance}`
    console.log('[EvolutionClient] getQRCode - URL:', url)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      })

      console.log('[EvolutionClient] getQRCode - Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EvolutionClient] getQRCode - Error response:', errorText)
        throw new Error(`Failed to get QR code (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log('[EvolutionClient] getQRCode - QR received, has base64:', !!data.base64)
      return data
    } catch (error) {
      console.error('[EvolutionClient] getQRCode - Exception:', error)
      throw error
    }
  }

  /**
   * Format phone number for WhatsApp
   * Cleans the number removing non-numeric characters
   * The number should already include the country code (e.g., 598 for Uruguay, 54 for Argentina)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters (spaces, dashes, parentheses, +, etc.)
    const cleaned = phone.replace(/\D/g, '')
    
    console.log('[EvolutionClient] formatPhoneNumber - input:', phone, 'output:', cleaned)

    return cleaned
  }

  /**
   * Check if a phone number has WhatsApp
   * Uses Evolution API's onWhatsApp endpoint
   */
  async checkNumberExists(phone: string): Promise<{ exists: boolean; jid?: string }> {
    try {
      const formattedNumber = this.formatPhoneNumber(phone)
      
      const url = `${this.config.baseUrl}/chat/whatsappNumbers/${this.config.instance}`
      const requestBody = {
        numbers: [formattedNumber],
      }
      
      console.log('[EvolutionClient] checkNumberExists - URL:', url)
      console.log('[EvolutionClient] checkNumberExists - Body:', JSON.stringify(requestBody))

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      })

      console.log('[EvolutionClient] checkNumberExists - Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EvolutionClient] checkNumberExists - Error response:', errorText)
        throw new Error(`Failed to check number: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('[EvolutionClient] checkNumberExists - Result:', result)
      
      // Evolution API returns array of results
      // Format: [{ exists: true/false, jid: "number@s.whatsapp.net", number: "number" }]
      const numberResult = result?.[0] || result
      
      return {
        exists: numberResult?.exists === true,
        jid: numberResult?.jid,
      }
    } catch (error) {
      console.error('Evolution API - checkNumberExists error:', error)
      throw error
    }
  }

  /**
   * Map Evolution status to our internal status
   */
  static mapStatus(evolutionStatus: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      PENDING: 'PENDING',
      SERVER_ACK: 'SENT',
      DELIVERY_ACK: 'DELIVERED',
      READ: 'READ',
      PLAYED: 'READ',
      ERROR: 'FAILED',
    }

    return statusMap[evolutionStatus] || 'PENDING'
  }

  /**
   * Set webhook configuration for the instance
   * This configures Evolution API to send events to our webhook
   */
  async setWebhook(webhookUrl: string): Promise<void> {
    const url = `${this.config.baseUrl}/webhook/set/${this.config.instance}`
    
    const webhookConfig = {
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'SEND_MESSAGE',
      ],
    }

    console.log('[EvolutionClient] setWebhook - URL:', url)
    console.log('[EvolutionClient] setWebhook - Config:', JSON.stringify(webhookConfig))

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(webhookConfig),
      })

      console.log('[EvolutionClient] setWebhook - Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EvolutionClient] setWebhook - Error response:', errorText)
        throw new Error(`Failed to set webhook (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log('[EvolutionClient] setWebhook - Success:', data)
    } catch (error) {
      console.error('[EvolutionClient] setWebhook - Exception:', error)
      throw error
    }
  }

  /**
   * Get current webhook configuration
   */
  async getWebhook(): Promise<any> {
    const url = `${this.config.baseUrl}/webhook/find/${this.config.instance}`
    
    console.log('[EvolutionClient] getWebhook - URL:', url)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      })

      console.log('[EvolutionClient] getWebhook - Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EvolutionClient] getWebhook - Error response:', errorText)
        return null
      }

      const data = await response.json()
      console.log('[EvolutionClient] getWebhook - Data:', data)
      return data
    } catch (error) {
      console.error('[EvolutionClient] getWebhook - Exception:', error)
      return null
    }
  }
}

/**
 * Create Evolution client from workspace config
 */
export function createEvolutionClient(config: {
  baseUrl: string
  apiKey: string
  instance: string
}): EvolutionClient {
  return new EvolutionClient(config)
}

/**
 * Create default client from environment variables
 */
export function getDefaultEvolutionClient(): EvolutionClient | null {
  const baseUrl = process.env.EVOLUTION_BASE_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!baseUrl || !apiKey || !instance) {
    return null
  }

  return new EvolutionClient({ baseUrl, apiKey, instance })
}
