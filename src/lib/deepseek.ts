/**
 * DeepSeek AI Client for Personalized Message Generation
 * 
 * Generates personalized WhatsApp/Email messages based on lead data
 * using DeepSeek's chat completion API.
 */

import type { Lead } from '@/types'

// DeepSeek API Configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

export type MessageTemplate = 'presentacion' | 'seguimiento' | 'sin_web'
export type MessageChannel = 'whatsapp' | 'email'

export interface GenerateMessageParams {
  lead: Lead
  template: MessageTemplate
  channel: MessageChannel
  customContext?: string
}

export interface GeneratedMessage {
  content: string
  subject?: string // Only for email
  tokensUsed?: number
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepSeekResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Build context string from lead data for AI personalization
 */
function buildLeadContext(lead: Lead): string {
  const parts: string[] = []

  // Basic info
  parts.push(`Nombre del contacto/negocio: ${lead.businessName || lead.name}`)
  
  if (lead.category) {
    parts.push(`Rubro/Industria: ${lead.category}`)
  }
  
  if (lead.city) {
    parts.push(`Ubicación: ${lead.city}${lead.address ? ` - ${lead.address}` : ''}`)
  }

  // Business metrics
  if (lead.rating !== undefined && lead.rating !== null) {
    parts.push(`Rating en Google: ${lead.rating}/5 (${lead.reviewCount || 0} reseñas)`)
  }

  if (lead.webProbability !== undefined && lead.webProbability !== null) {
    const needsWeb = lead.webProbability > 70 
      ? 'Alta probabilidad de que necesite web'
      : lead.webProbability > 40 
        ? 'Probabilidad media de necesitar web'
        : 'Baja probabilidad de necesitar web'
    parts.push(`Probabilidad web: ${lead.webProbability}% - ${needsWeb}`)
  }

  // Website status
  if (lead.website) {
    parts.push(`Web actual: ${lead.website}`)
  } else {
    parts.push('NO tiene sitio web actualmente')
  }

  // CRM status
  if (lead.status) {
    parts.push(`Estado en CRM: ${lead.status}`)
  }

  // Notes (important context)
  if (lead.notes) {
    parts.push(`Notas del vendedor: ${lead.notes}`)
  }

  // Last contact
  if (lead.lastContactedAt) {
    const lastContact = new Date(lead.lastContactedAt)
    const daysAgo = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    parts.push(`Último contacto: hace ${daysAgo} días`)
  }

  return parts.join('\n')
}

/**
 * Get system prompt based on template type
 * Basado en metodologías de: Alfonso y Christian (hooks), Chris Voss (negociación empática),
 * Brian Tracy (psicología de ventas), Tony Robbins (rapport), Warren Buffett (valor a largo plazo)
 */
function getSystemPrompt(template: MessageTemplate, channel: MessageChannel): string {
  const baseStyle = `
Sos un experto en prospección B2B y ventas consultivas. Te llamás Máximo y tu estilo es natural, directo y genuino.

Combinás las metodologías de:
- Alfonso y Christian (hooks específicos, conversación primero, nunca vender directo)
- Chris Voss (negociación táctica empática, preguntas calibradas)
- Brian Tracy (psicología de ventas, mentalidad de abundancia)
- Tony Robbins (rapport instantáneo, estado emocional)
- Warren Buffett (valor a largo plazo, relaciones genuinas)

PRINCIPIOS FUNDAMENTALES:

1. HOOK PODEROSO
- Pregunta específica que identifica un pain point real
- Observación concreta sobre su negocio
- NUNCA frases genéricas ("me encantaría ayudarte", "mejorar tu presencia digital")

2. CREDIBILIDAD INMEDIATA
- Con quién trabajás (industria específica)
- Qué lográs (resultados concretos, no promesas)
- Positioning claro (desarrollo web y marketing digital)

3. PROPUESTA DE BAJO RIESGO
- "Charla de 10-15 min" (no "reunión", no "presentación")
- Frame de ayuda, no de venta
- Hacer fácil el "sí"

4. TONO Y ESTILO
- Conversacional pero profesional
- Directo al punto (máximo 4-5 líneas)
- Lenguaje simple, sin jerga técnica
- Empático pero asertivo
- Usá "vos" (español rioplatense argentino)
- Soná natural, como si escribieras a un conocido

5. ESTRUCTURA
Línea 1: Hook (pregunta o insight específico sobre SU negocio)
Línea 2-3: Qué hacés + credibilidad breve
Línea 4: CTA simple y de bajo compromiso

PROHIBIDO:
- Vender precio o características
- Ser genérico o aplicable a cualquier negocio
- Usar más de 5 líneas
- Sonar desesperado o insistente
- Hablar de vos mismo antes del cliente
- Emojis excesivos (máximo 1 si es muy apropiado)
- Saludos genéricos como "Espero que estés bien"

OBJETIVO ÚNICO:
Generar una respuesta que abra conversación. Punto. No cerrar venta, no educar, no impresionar.
`.trim()

  const templateInstructions: Record<MessageTemplate, string> = {
    presentacion: `
TIPO: PRIMER CONTACTO (Presentación)
- Hook específico sobre algo que notaste de su negocio (Google Maps, redes, ubicación)
- Mencioná que ayudás a negocios de su rubro específico
- CTA: pregunta si tienen 10 min para una charla rápida
`,
    seguimiento: `
TIPO: SEGUIMIENTO
- Referenciá brevemente el contacto anterior de forma natural
- Agregá valor nuevo (dato, insight, caso de éxito relevante)
- NO seas insistente - frame de "por si te sirve"
- CTA: preguntá si es buen momento o si preferís que hablemos otro día
`,
    sin_web: `
TIPO: NEGOCIO SIN WEB
- Mencioná de forma no crítica que notaste que no tienen web
- Explicá brevemente una oportunidad concreta que están perdiendo
- NO seas condescendiente ni uses miedo
- CTA: ofrecé una consulta rápida sin compromiso para mostrarles qué están haciendo otros de su rubro
`,
  }

  const channelInstructions = channel === 'email' 
    ? '\n\nPara EMAIL: También generá un asunto corto y atractivo (máx 6 palabras). Formato: primero el asunto en una línea, luego "---" y después el cuerpo del mensaje.'
    : '\n\nPara WHATSAPP: Mensaje muy conciso y conversacional. Máximo 4-5 líneas.'

  return baseStyle + '\n' + templateInstructions[template] + channelInstructions
}

/**
 * Parse the AI response to extract content and subject (for email)
 */
function parseResponse(response: string, channel: MessageChannel): GeneratedMessage {
  if (channel === 'email') {
    // Format expected: "Subject line\n---\nBody content"
    const parts = response.split('---')
    if (parts.length >= 2) {
      return {
        subject: parts[0].trim(),
        content: parts.slice(1).join('---').trim(),
      }
    }
  }
  
  return { content: response.trim() }
}

/**
 * Generate a personalized message using DeepSeek AI
 */
export async function generatePersonalizedMessage(
  params: GenerateMessageParams
): Promise<GeneratedMessage> {
  const { lead, template, channel, customContext } = params

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured')
  }

  const leadContext = buildLeadContext(lead)
  const systemPrompt = getSystemPrompt(template, channel)

  const userPrompt = `
Genera un mensaje de ${channel === 'whatsapp' ? 'WhatsApp' : 'email'} personalizado para este prospecto:

${leadContext}
${customContext ? `\nContexto adicional: ${customContext}` : ''}

Genera solo el mensaje, sin explicaciones adicionales.
`.trim()

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[DeepSeek] API error:', error)
    throw new Error(`DeepSeek API error: ${response.status}`)
  }

  const data: DeepSeekResponse = await response.json()
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from DeepSeek API')
  }

  const generatedContent = data.choices[0].message.content
  const result = parseResponse(generatedContent, channel)

  return {
    ...result,
    tokensUsed: data.usage?.total_tokens,
  }
}

/**
 * Template display names for UI
 */
export const TEMPLATE_LABELS: Record<MessageTemplate, string> = {
  presentacion: 'Presentación',
  seguimiento: 'Seguimiento',
  sin_web: 'Sin web',
}
