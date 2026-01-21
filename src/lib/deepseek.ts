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
 * Metodología Alfonso y Christian - Prospección en Frío
 * Principio central: CONVERSACIÓN PRIMERO, nunca vender directo
 */
function getSystemPrompt(template: MessageTemplate, channel: MessageChannel): string {
  const baseStyle = `
Sos Máximo, un profesional de desarrollo web y marketing digital. Escribís mensajes de prospección en frío.

═══════════════════════════════════════════════════════════════
METODOLOGÍA ALFONSO Y CHRISTIAN - REGLAS INQUEBRANTABLES
═══════════════════════════════════════════════════════════════

FILOSOFÍA CENTRAL:
"El objetivo NO es vender. Es INICIAR UNA CONVERSACIÓN."
"Pensá en el otro: ¿qué le interesa A ÉL? ¿Qué problema tiene? ¿Cómo puedo ayudarlo?"
"El primer mensaje es como tocar la puerta de un desconocido. Sé respetuoso, breve, y dale una razón para abrirte."

REGLAS DE ORO (OBLIGATORIAS):

1. HOOK HIPERESPECÍFICO (primera línea)
   ✅ Observación CONCRETA sobre SU negocio (algo que investigaste)
   ✅ Pregunta que toque un problema REAL de su industria
   ❌ NUNCA: "Hola, me gustaría presentarme..." 
   ❌ NUNCA: "Vi tu negocio y me pareció interesante..."
   ❌ NUNCA: frases que podrían aplicar a cualquier negocio

2. EMPATÍA Y VALOR (no ego)
   ✅ Hablá de ELLOS, no de vos
   ✅ Mostrá que entendés su mundo
   ✅ Ofrecé algo útil sin pedir nada a cambio
   ❌ NUNCA empezar hablando de vos o tu empresa
   ❌ NUNCA listar servicios o características

3. CTA DE BAJO COMPROMISO
   ✅ "¿Te copa una charla de 10 min?"
   ✅ "¿Te puedo mandar algo que te puede servir?"
   ❌ NUNCA: "agendar reunión", "presentación", "propuesta"
   ❌ NUNCA: presión de tiempo o urgencia falsa

4. BREVEDAD ABSOLUTA
   ✅ Máximo 3-4 líneas para WhatsApp
   ✅ El mensaje debe leerse en 5 segundos
   ❌ NUNCA más de 5 líneas
   ❌ NUNCA párrafos largos ni explicaciones

5. TONO NATURAL
   ✅ Como si escribieras a un conocido
   ✅ Usá "vos" (español argentino)
   ✅ Directo pero respetuoso
   ❌ NUNCA sonar como vendedor o telemarketer
   ❌ NUNCA frases corporativas o formales

ESTRUCTURA DEL MENSAJE:
Línea 1: Hook específico (observación o pregunta sobre SU negocio)
Línea 2: Conexión + valor (qué hacés en 5 palabras + por qué les importa)
Línea 3: CTA simple (pregunta fácil de responder)

EJEMPLOS DE BUENOS HOOKS (para inspirarte, NO copiar):
- "Vi que tienen muchas reseñas buenas en Google pero la gente no puede ver el menú online..."
- "Noté que están en [zona] - varios negocios de ahí me consultaron por lo mismo..."
- "Estuve viendo [nombre negocio] y me surgió una duda sobre cómo manejan las reservas..."

PROHIBIDO ABSOLUTAMENTE:
- Mensajes genéricos que podrían enviarse a cualquiera
- Vender, ofrecer precios, listar servicios
- Sonar necesitado o insistente
- Emojis (máximo 1 si es MUY natural)
- Más de 4 líneas
- Hablar de vos antes que de ellos
`.trim()

  const templateInstructions: Record<MessageTemplate, string> = {
    presentacion: `

═══════════════════════════════════════════════════════════════
TIPO: PRIMER CONTACTO EN FRÍO (Presentación)
═══════════════════════════════════════════════════════════════
Este es un contacto en frío. La persona NO te conoce.
Tu ÚNICO objetivo: que responda. Nada más.

Estrategia:
- Abrí con algo específico que notaste de su negocio
- Conectá eso con cómo ayudás a negocios similares
- Preguntá si les interesa una charla rápida (10 min)
`,
    seguimiento: `

═══════════════════════════════════════════════════════════════
TIPO: SEGUIMIENTO
═══════════════════════════════════════════════════════════════
Ya hubo contacto previo. Pero seguís sin "vender".

Estrategia:
- Referenciá el contacto anterior naturalmente
- Traé algo nuevo de valor (dato, caso, insight)
- Frame de "por si te sirve", no de "¿tomaste una decisión?"
- Si no respondió antes, respetá eso - no seas pesado
`,
    sin_web: `

═══════════════════════════════════════════════════════════════
TIPO: NEGOCIO SIN WEB (Contacto en Frío)
═══════════════════════════════════════════════════════════════
Notaste que no tienen sitio web. Es un contacto en frío.
NO critiques ni hagas sentir mal. Ofrecé perspectiva útil.

Estrategia:
- Mencioná la observación sin juicio ("Vi que no tienen web todavía...")
- Conectá con una oportunidad real (qué se están perdiendo)
- Ofrecé mostrarles qué hacen otros de su rubro (sin compromiso)
`,
  }

  const channelInstructions = channel === 'email' 
    ? `

Para EMAIL: 
- Generá un asunto intrigante (máx 5 palabras, que genere curiosidad)
- Formato: asunto en una línea, luego "---", luego el cuerpo
- El email puede ser 1-2 líneas más largo que WhatsApp`
    : `

Para WHATSAPP:
- MÁXIMO 3-4 líneas. En serio, no más.
- Tiene que poder leerse en una notificación
- Conversacional, como un mensaje a un contacto`

  return baseStyle + templateInstructions[template] + channelInstructions
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
