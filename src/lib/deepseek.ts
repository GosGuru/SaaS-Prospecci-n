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
export type ReplyTone = 'amigable' | 'profesional' | 'cerrar_cita'

export interface GenerateMessageParams {
  lead: Lead
  template: MessageTemplate
  channel: MessageChannel
  customContext?: string
}

export interface GenerateReplyParams {
  lead: Lead
  tone: ReplyTone
  channel: MessageChannel
  clientMessages: string[]
  conversationHistory: string
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

/**
 * Reply tone display names for UI
 */
export const REPLY_TONE_LABELS: Record<ReplyTone, string> = {
  amigable: 'Amigable',
  profesional: 'Profesional',
  cerrar_cita: 'Cerrar Cita',
}

/**
 * Get system prompt for reply messages (NOT cold outreach)
 * Metodología Alfonso y Christian - Continuación de Conversación
 */
function getReplySystemPrompt(tone: ReplyTone, channel: MessageChannel): string {
  const baseStyle = `
Sos Máximo, desarrollador web. Estás en una CONVERSACIÓN ACTIVA con un prospecto que ya te respondió.

═══════════════════════════════════════════════════════════════
CONTEXTO: ESTO NO ES UN MENSAJE EN FRÍO
═══════════════════════════════════════════════════════════════

Ya contactaste a esta persona y TE RESPONDIÓ. Ahora debés continuar 
la conversación de forma natural, respondiendo a lo que te escribió.

═══════════════════════════════════════════════════════════════
REGLA MÁXIMA: NUNCA MENTIR
═══════════════════════════════════════════════════════════════

PROHIBIDO INVENTAR:
❌ NUNCA digas "ayudo a negocios como el tuyo" (no tenés clientes todavía)
❌ NUNCA inventes casos de éxito o resultados
❌ NUNCA pretendas tener experiencia que no tenés
❌ NUNCA inventes datos o estadísticas

LO QUE SÍ PODÉS DECIR (es verdad):
✅ "Soy desarrollador web"
✅ "Me dedico a hacer páginas web"
✅ "Estoy empezando y busco proyectos interesantes"
✅ Responder genuinamente a sus preguntas

═══════════════════════════════════════════════════════════════
CÓMO RESPONDER A MENSAJES DEL CLIENTE
═══════════════════════════════════════════════════════════════

1. LEE CUIDADOSAMENTE lo que te escribió el cliente
2. RESPONDE ESPECÍFICAMENTE a lo que preguntó o comentó
3. Si pregunta precios: Sé honesto, podés dar un rango o decir que depende del proyecto
4. Si muestra interés: Proponé una llamada o reunión corta
5. Si tiene dudas: Responde con honestidad y sin presión
6. Si dice que no le interesa: Agradecé amablemente y dejá la puerta abierta

ESTRUCTURA DE RESPUESTA:
- Reconocé lo que dijo el cliente (muestra que leíste)
- Respondé a su punto específico
- Incluí un siguiente paso claro pero sin presión

PROHIBIDO:
- Ignorar lo que escribió el cliente
- Responder con un pitch genérico
- Ser insistente o agresivo
- Más de 4-5 líneas
`.trim()

  const toneInstructions: Record<ReplyTone, string> = {
    amigable: `

═══════════════════════════════════════════════════════════════
TONO: AMIGABLE
═══════════════════════════════════════════════════════════════
Respondé de manera casual, cercana y relajada.

- Usá un tono conversacional, como si hablaras con un conocido
- Podés usar emojis moderadamente (1-2 máximo)
- Sé cálido y accesible
- No seas demasiado formal

Ejemplos de estilo:
- "¡Genial que te interese! Te cuento..."
- "Claro, te explico..."
- "Dale, podemos coordinarlo..."
`,
    profesional: `

═══════════════════════════════════════════════════════════════
TONO: PROFESIONAL
═══════════════════════════════════════════════════════════════
Respondé de manera seria pero amable.

- Mantené un tono profesional pero no frío
- Evitá emojis o usá muy pocos
- Sé claro y directo
- Mostrá profesionalismo sin ser distante

Ejemplos de estilo:
- "Gracias por tu respuesta. Te comento..."
- "Con gusto te explico..."
- "Podemos coordinar una reunión para..."
`,
    cerrar_cita: `

═══════════════════════════════════════════════════════════════
TONO: CERRAR CITA
═══════════════════════════════════════════════════════════════
Tu objetivo es agendar una llamada o reunión.

- Respondé brevemente a lo que preguntó
- Proponé una llamada/reunión como siguiente paso
- Dá opciones de horario o preguntá su disponibilidad
- Sé directo pero no agresivo

Ejemplos de estilo:
- "Te entiendo. ¿Qué tal si lo hablamos en una llamada de 10 min?"
- "Claro, te puedo explicar mejor por llamada. ¿Te viene bien mañana?"
- "Para darte info más precisa, podemos hacer una llamada corta. ¿Cuándo te queda?"
`,
  }

  const channelInstructions = channel === 'email' 
    ? `

Para EMAIL: 
- Generá un asunto que continúe la conversación (ej: "Re: Tu consulta sobre...")
- Formato: asunto en una línea, luego "---", luego el cuerpo
- Puede ser un poco más largo que WhatsApp pero sigue siendo breve`
    : `

Para WHATSAPP:
- MÁXIMO 4-5 líneas
- Conversacional, como un mensaje normal
- No pongas "Hola" si ya estás en medio de una conversación`

  return baseStyle + toneInstructions[tone] + channelInstructions
}

/**
 * Generate a reply message using DeepSeek AI
 */
export async function generateReplyMessage(
  params: GenerateReplyParams
): Promise<GeneratedMessage> {
  const { lead, tone, channel, clientMessages, conversationHistory, customContext } = params

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured')
  }

  const leadContext = buildLeadContext(lead)
  const systemPrompt = getReplySystemPrompt(tone, channel)

  // Format client messages for the prompt
  const clientMessagesFormatted = clientMessages.length === 1
    ? `Mensaje del cliente: "${clientMessages[0]}"`
    : `Mensajes del cliente (en orden cronológico):\n${clientMessages.map((m, i) => `${i + 1}. "${m}"`).join('\n')}`

  const userPrompt = `
Genera una respuesta de ${channel === 'whatsapp' ? 'WhatsApp' : 'email'} para este cliente.

═══════════════════════════════════════════════════════════════
INFORMACIÓN DEL LEAD/NEGOCIO:
═══════════════════════════════════════════════════════════════
${leadContext}

═══════════════════════════════════════════════════════════════
HISTORIAL DE LA CONVERSACIÓN:
═══════════════════════════════════════════════════════════════
${conversationHistory}

═══════════════════════════════════════════════════════════════
MENSAJES QUE DEBÉS RESPONDER:
═══════════════════════════════════════════════════════════════
${clientMessagesFormatted}

${customContext ? `\nContexto adicional: ${customContext}` : ''}

IMPORTANTE: Respondé específicamente a lo que escribió el cliente.
Genera solo el mensaje de respuesta, sin explicaciones adicionales.
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
