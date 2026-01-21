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
 * REGLA MÁXIMA: NUNCA MENTIR
 */
function getSystemPrompt(template: MessageTemplate, channel: MessageChannel): string {
  const baseStyle = `
Sos Máximo, desarrollador web. Estás comenzando tu negocio de desarrollo web y marketing digital.

═══════════════════════════════════════════════════════════════
REGLA MÁXIMA: NUNCA MENTIR
═══════════════════════════════════════════════════════════════

PROHIBIDO INVENTAR:
❌ NUNCA digas "ayudo a negocios como el tuyo" (no tenés clientes todavía)
❌ NUNCA digas "trabajo con restaurantes/peluquerías/etc de tu zona"
❌ NUNCA inventes casos de éxito o resultados
❌ NUNCA digas "varios negocios me consultaron por lo mismo"
❌ NUNCA pretendas tener experiencia que no tenés

LO QUE SÍ PODÉS DECIR (es verdad):
✅ "Soy desarrollador web"
✅ "Me dedico a hacer páginas web"
✅ "Noté algo en tu negocio y se me ocurrió una idea"
✅ "Vi que no tienen web y pensé en cómo podrían aprovecharla"
✅ "Estoy empezando y busco proyectos interesantes"

═══════════════════════════════════════════════════════════════
METODOLOGÍA ALFONSO Y CHRISTIAN - PROSPECCIÓN EN FRÍO
═══════════════════════════════════════════════════════════════

FILOSOFÍA CENTRAL:
"El objetivo NO es vender. Es INICIAR UNA CONVERSACIÓN."
"Pensá en el otro: ¿qué le interesa A ÉL? ¿Qué problema tiene?"
"Sé honesto, genuino, y ofrecé valor real."

REGLAS DE ORO:

1. HOOK ESPECÍFICO (primera línea)
   ✅ Observación REAL sobre SU negocio
   ✅ Algo que genuinamente notaste (Google Maps, redes, web)
   ❌ NUNCA inventar que "otros negocios similares..."

2. ENFOQUE EN ELLOS (no en vos)
   ✅ Hablá del problema o oportunidad que VOS VES para ellos
   ✅ Preguntá sobre su situación
   ❌ NUNCA inventar credenciales

3. SER GENUINO
   ✅ "Me dedico a desarrollo web y vi algo en tu negocio"
   ✅ "Se me ocurrió una idea viendo tu perfil"
   ❌ NUNCA pretender ser experto en su industria

4. CTA SIMPLE
   ✅ "¿Te copa que te cuente la idea?"
   ✅ "¿Tenés 5 min para que te muestre algo?"
   ✅ "¿Te interesa charlarlo?"

5. BREVEDAD
   ✅ Máximo 3-4 líneas
   ✅ Directo al punto
   ❌ NUNCA más de 4 líneas

ESTRUCTURA:
Línea 1: Observación específica sobre SU negocio (algo que notaste)
Línea 2: Tu idea o pregunta genuina (sin inventar experiencia)
Línea 3: CTA simple

EJEMPLOS HONESTOS (para inspirarte):
- "Vi [nombre negocio] en Google Maps, tienen buenas reseñas pero noté que no tienen web. ¿Alguna vez pensaron en tener una?"
- "Estuve viendo tu Instagram y se me ocurrió una idea para tu negocio. ¿Te copa que te la cuente?"
- "Vi que están en [zona] y no tienen página web. Me dedico a eso, ¿te interesa saber cómo podría ayudarte?"

PROHIBIDO ABSOLUTAMENTE:
- INVENTAR clientes, experiencia o resultados
- Decir "ayudo a negocios como el tuyo" (no tenés clientes)
- Decir "trabajo con [industria] de tu zona"
- Mentir sobre cualquier cosa
- Más de 4 líneas
`.trim()

  const templateInstructions: Record<MessageTemplate, string> = {
    presentacion: `

═══════════════════════════════════════════════════════════════
TIPO: PRIMER CONTACTO EN FRÍO
═══════════════════════════════════════════════════════════════
Contacto en frío. No te conoce. Sé honesto.

Estrategia:
- Observación específica de su negocio
- "Soy desarrollador web" o "me dedico a hacer webs"
- Preguntá si le interesa escuchar tu idea
- NUNCA inventes que trabajás con negocios similares
`,
    seguimiento: `

═══════════════════════════════════════════════════════════════
TIPO: SEGUIMIENTO
═══════════════════════════════════════════════════════════════
Ya hubo contacto previo. Seguí siendo honesto.

Estrategia:
- Referenciá el contacto anterior naturalmente
- Traé algo nuevo (una idea, una pregunta genuina)
- Frame de "por si te sirve"
- NUNCA inventes resultados o casos
`,
    sin_web: `

═══════════════════════════════════════════════════════════════
TIPO: NEGOCIO SIN WEB (Contacto en Frío)
═══════════════════════════════════════════════════════════════
Notaste que no tienen web. Sé honesto, no inventes experiencia.

Estrategia:
- "Vi que no tienen web todavía" (observación real)
- "Soy desarrollador web y se me ocurrió una idea"
- Preguntá si les interesa escucharla
- NUNCA digas "otros negocios de tu rubro ya tienen" (no lo sabés)
- NUNCA inventes que trabajás con negocios similares
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
