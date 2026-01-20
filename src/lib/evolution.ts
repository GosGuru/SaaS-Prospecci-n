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

      const response = await fetch(
        `${this.config.baseUrl}/message/sendText/${this.config.instance}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            number: formattedNumber,
            text: payload.text,
            linkPreview: payload.linkPreview ?? true,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to send message: ${response.statusText}`)
      }

      return await response.json()
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
   * Ensures proper format with country code
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')

    // If starts with 0, assume Argentina local and add country code
    if (cleaned.startsWith('0')) {
      cleaned = '54' + cleaned.substring(1)
    }

    // If doesn't start with country code, assume Argentina
    if (!cleaned.startsWith('54') && cleaned.length === 10) {
      cleaned = '54' + cleaned
    }

    // Remove the 9 after country code for Argentina (if present)
    // WhatsApp format: 549XXXXXXXXXX -> 54XXXXXXXXXX
    if (cleaned.startsWith('549') && cleaned.length === 13) {
      cleaned = '54' + cleaned.substring(3)
    }

    return cleaned
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
