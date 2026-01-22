/**
 * DeepSeek AI Client for Personalized Message Generation
 * 
 * Generates personalized WhatsApp/Email messages based on lead data
 * using DeepSeek's chat completion API.
 * 
 * METODOLOGÍA: Prospección empática con enfoque en soluciones por nicho
 */

import type { Lead } from '@/types'
import { getNicheSolutions, findNicheCategory, type NicheSolution } from './niche-solutions'

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
 * Get current date/time context for the AI
 */
function getTemporalContext(): string {
  const now = new Date()
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  
  const dayName = days[now.getDay()]
  const dayNum = now.getDate()
  const monthName = months[now.getMonth()]
  const year = now.getFullYear()
  const hour = now.getHours()
  
  let momentoDelDia = 'la mañana'
  if (hour >= 12 && hour < 18) momentoDelDia = 'la tarde'
  else if (hour >= 18 || hour < 6) momentoDelDia = 'la noche'
  
  return `${dayName} ${dayNum} de ${monthName} ${year}, ${momentoDelDia}`
}

/**
 * Build context string from lead data for AI personalization
 * Now includes niche-specific solutions
 */
function buildLeadContext(lead: Lead): string {
  const parts: string[] = []

  // Basic info
  parts.push(`Nombre del negocio: ${lead.businessName || lead.name}`)
  
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
    parts.push('⚠️ NO tiene sitio web actualmente')
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

  // Add niche-specific context
  const nicheSolutions = getNicheSolutions(lead.category)
  const nicheKey = findNicheCategory(lead.category)
  
  parts.push('')
  parts.push('═══ ANÁLISIS DEL NICHO ═══')
  parts.push(`Categoría detectada: ${nicheKey}`)
  parts.push(`Problemas típicos de este rubro:`)
  nicheSolutions.problemas.slice(0, 3).forEach(p => parts.push(`  • ${p}`))
  parts.push(`Soluciones que podríamos ofrecer:`)
  nicheSolutions.soluciones.slice(0, 3).forEach(s => parts.push(`  • ${s}`))

  return parts.join('\n')
}

/**
 * Get system prompt based on template type
 * NUEVA METODOLOGÍA: Empatía por Nicho + Soluciones Específicas + CTA Llamada
 */
function getSystemPrompt(template: MessageTemplate, channel: MessageChannel, lead: Lead): string {
  const temporalContext = getTemporalContext()
  const nicheSolutions = getNicheSolutions(lead.category)
  const nicheKey = findNicheCategory(lead.category)
  
  const baseStyle = `
═══════════════════════════════════════════════════════════════
CONTEXTO TEMPORAL Y PERSONAL
═══════════════════════════════════════════════════════════════

Fecha y hora actual: ${temporalContext}
Tu ubicación: Montevideo, Uruguay

═══════════════════════════════════════════════════════════════
¿QUIÉN SOS VOS?
═══════════════════════════════════════════════════════════════

Sos Máximo, desarrollador web y especialista en soluciones digitales.

SOBRE VOS:
• Desarrollador web full-stack
• Especializado en crear soluciones digitales para pequeños y medianos negocios
• Conocimientos en: React, Next.js, Node.js, bases de datos, hosting, dominios
• Enfoque práctico: no solo hacés webs bonitas, resolvés PROBLEMAS reales
• Estás empezando tu negocio independiente, buscando clientes donde puedas aportar valor real
• Ubicación: Montevideo, Uruguay (podés trabajar remoto para toda LATAM)

LO QUE PODÉS OFRECER:
• Páginas web profesionales y modernas
• Sistemas de reservas/turnos online
• Tiendas online (e-commerce)
• Catálogos digitales de productos/servicios
• Automatizaciones (WhatsApp, email, notificaciones)
• Presencia en Google optimizada

═══════════════════════════════════════════════════════════════
REGLA MÁXIMA: NUNCA MENTIR
═══════════════════════════════════════════════════════════════

PROHIBIDO INVENTAR:
❌ NUNCA digas "ayudo a negocios como el tuyo" de forma genérica
❌ NUNCA inventes casos de éxito o resultados específicos
❌ NUNCA pretendas conocer su negocio más de lo que sabés
❌ NUNCA inventes datos o estadísticas

LO QUE SÍ PODÉS DECIR (es verdad):
✅ "Soy desarrollador web"
✅ "Me especializo en soluciones digitales para negocios"
✅ "Noté algo en tu negocio y se me ocurrió cómo podría ayudarte"
✅ "Vi que no tienen web y pensé en cómo podrían aprovecharla"

═══════════════════════════════════════════════════════════════
METODOLOGÍA: EMPATÍA POR NICHO
═══════════════════════════════════════════════════════════════

PASO 1 - RAZONAMIENTO INTERNO (no lo escribas en el mensaje):
Antes de escribir, pensá:
- ¿Qué problemas operativos tiene este tipo de negocio en su día a día?
- ¿Qué tareas manuales o caóticas podrían mejorar con tecnología?
- ¿Qué oportunidades están perdiendo por no tener presencia digital?
- ¿Cuál es LA solución más impactante para ESTE negocio específico?

PASO 2 - ELEGÍ UNA SOLUCIÓN:
Del análisis del nicho que te paso, elegí SOLO 1 solución (máximo 2 si están muy relacionadas) que sea la más relevante para este negocio en particular. 
No los abrumes con todas las posibilidades.

PASO 3 - EMPATIZÁ CON SU REALIDAD:
Mencioná el problema DE ELLOS, no tu servicio.
Ejemplo para taller mecánico: "para que no se te colapsen los turnos los lunes"
Ejemplo para peluquería: "para que no se te crucen más las citas"
Ejemplo para restaurante: "para que no te llamen solo a preguntar el menú"

═══════════════════════════════════════════════════════════════
ESTRUCTURA DEL MENSAJE
═══════════════════════════════════════════════════════════════

LÍNEA 1: Hook específico sobre SU negocio
  → Algo que genuinamente notaste (en Google Maps, Instagram, su local)

LÍNEA 2-3: Problema + Solución específica para su nicho  
  → "Me puse a pensar cómo [SOLUCIÓN] podría [BENEFICIO PARA ELLOS]"
  → Sé específico al nicho, no genérico

LÍNEA 4-5: CTA para llamada
  → "¿Te interesa? Podemos tener una llamadita rápida y te explico mejor"
  → O variaciones: "Si te copa, te puedo contar más en una llamada de 5 min"

═══════════════════════════════════════════════════════════════
REGLAS DE ESTILO
═══════════════════════════════════════════════════════════════

✅ Natural, como escribirías a un conocido (pero respetuoso)
✅ Tuteo casual pero profesional
✅ Podés usar 1-2 emojis si queda natural
✅ MÁXIMO 5 líneas para WhatsApp
✅ SIEMPRE terminá con propuesta de llamada/reunión
❌ Nada de "Estimado/a" ni formalidades excesivas
❌ No empezar con "Hola, soy Máximo" - es muy genérico
❌ No listar múltiples servicios - elegí UNO relevante
`.trim()

  // Template-specific instructions with concrete examples per niche
  const templateInstructions: Record<MessageTemplate, string> = {
    presentacion: `

═══════════════════════════════════════════════════════════════
TIPO: PRIMER CONTACTO EN FRÍO (PRESENTACIÓN)
═══════════════════════════════════════════════════════════════

Es tu PRIMER mensaje. No te conoce. El objetivo es INICIAR CONVERSACIÓN, no vender.

ENFOQUE:
1. Observación específica de su negocio (demostrá que lo viste)
2. UNA idea/solución concreta basada en su nicho
3. Propuesta de llamada para explicar más

EJEMPLOS POR NICHO (para inspirarte, NO copies textual):

TALLER MECÁNICO:
"Vi el taller en Google Maps, tienen buenas reseñas 💪 
Se me ocurrió cómo podrían tener un sistema de turnos online para que no se les colapsen los lunes y los clientes reserven solos. 
Si te interesa, te lo puedo contar en una llamadita de 5 min"

PELUQUERÍA:
"Vi que tienen el salón en [zona], buenas reseñas en Google 
Me puse a pensar cómo un sistema de reservas online les ahorraría el ida y vuelta por WhatsApp y evitaría que se crucen turnos.
¿Te copa que te cuente? Podemos hacer una llamada rápida"

RESTAURANTE:
"Vi el restaurante en Google Maps, se ve muy bueno 🍽️
Noté que no tienen menú online y pensé cómo podrían evitar que los llamen solo para preguntar qué tienen.
Si te interesa, te cuento la idea en una llamada corta"
`,

    seguimiento: `

═══════════════════════════════════════════════════════════════
TIPO: SEGUIMIENTO (YA HUBO CONTACTO PREVIO)
═══════════════════════════════════════════════════════════════

Ya contactaste a este negocio antes. Ahora hacés seguimiento.

ENFOQUE:
1. Referencia breve al contacto anterior (no seas pesado)
2. Traé algo NUEVO: otra perspectiva, otra solución, o un recordatorio suave
3. Re-proponé la llamada de forma natural

EJEMPLOS POR NICHO:

TALLER MECÁNICO:
"Buenas! Te había escrito hace unos días sobre el tema de turnos online
Me quedé pensando y la verdad que para un taller como el de ustedes sería ideal poder mandarle al cliente un aviso automático cuando el auto está listo.
¿Tenés 5 min para que te cuente cómo funcionaría?"

PELUQUERÍA:
"Hola! Soy Máximo, te había escrito por el tema de las reservas
Se me ocurrió otra cosa: además del sistema de turnos, podrían tener una galería online de trabajos para que los clientes nuevos vean los estilos.
¿Te copa que hablemos en una llamada rápida?"

RESTAURANTE:
"Buenas! Te había contactado por el tema del menú digital
Pensándolo mejor, también podrían sumar reservas online para los fines de semana que tienen más demanda.
¿Cuándo te viene bien una llamadita para charlarlo?"
`,

    sin_web: `

═══════════════════════════════════════════════════════════════
TIPO: NEGOCIO SIN WEB (Primer Contacto - Énfasis en la oportunidad)
═══════════════════════════════════════════════════════════════

Este negocio NO tiene página web. Es una oportunidad clara.

ENFOQUE:
1. Mencioná que notaste que no tienen web (observación real, no crítica)
2. Enfocate en UN problema concreto que están teniendo por eso
3. Proponé la solución específica para su nicho
4. CTA de llamada

EJEMPLOS POR NICHO:

TALLER MECÁNICO:
"Vi el taller en Google, tienen 4.5 estrellas pero noté que no tienen web propia.
Pensé cómo un sistema de turnos online les resolvería el tema de organizar los trabajos y que el cliente reserve solo.
¿Te interesa? Te lo puedo explicar mejor en una llamada de 5 min"

PELUQUERÍA:
"Vi el salón en Google Maps, buenas reseñas! Noté que no tienen página web todavía.
Me imaginé cómo les vendría tener reservas online y una galería de trabajos para atraer clientes nuevos.
Si te copa, hacemos una llamada rápida y te cuento"

RESTAURANTE:
"Vi el restaurante en Google, se ve muy bueno. Noté que no tienen web.
Un menú digital + reservas online les sacaría un montón de llamadas de encima.
¿Qué tal si lo hablamos en una llamadita? Te explico cómo funciona"

NEGOCIO GENÉRICO:
"Vi el negocio en Google Maps, tienen buenas reseñas pero noté que no tienen web propia.
Hoy en día mucha gente busca en Google antes de ir a un lugar, y sin web están perdiendo esa visibilidad.
¿Te interesa que te cuente cómo lo solucionamos? Podemos hacer una llamada de 5 min"
`,
  }

  const channelInstructions = channel === 'email' 
    ? `

═══════════════════════════════════════════════════════════════
CANAL: EMAIL
═══════════════════════════════════════════════════════════════
- Generá un asunto intrigante (máx 6 palabras, que genere curiosidad)
- Formato: asunto en una línea, luego "---", luego el cuerpo
- El email puede tener 1-2 líneas más que WhatsApp
- Mantené la misma estructura: hook + solución + CTA llamada

Ejemplos de asuntos:
- "Una idea para [nombre negocio]"
- "Vi [nombre] en Google Maps"
- "Sobre el tema de turnos"`
    : `

═══════════════════════════════════════════════════════════════
CANAL: WHATSAPP
═══════════════════════════════════════════════════════════════
- MÁXIMO 5 líneas. En serio.
- Tiene que poder leerse completo en la notificación del celular
- Conversacional, como un mensaje a un contacto
- Podés usar 1-2 emojis si queda natural
- SIEMPRE terminá proponiendo una llamada/reunión`

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
  const systemPrompt = getSystemPrompt(template, channel, lead)
  const nicheSolutions = getNicheSolutions(lead.category)
  const nicheKey = findNicheCategory(lead.category)

  const userPrompt = `
═══════════════════════════════════════════════════════════════
INFORMACIÓN DEL PROSPECTO
═══════════════════════════════════════════════════════════════

${leadContext}

═══════════════════════════════════════════════════════════════
SOLUCIONES ESPECÍFICAS PARA ESTE NICHO (${nicheKey.toUpperCase()})
═══════════════════════════════════════════════════════════════

Problemas típicos que tienen:
${nicheSolutions.problemas.map(p => `• ${p}`).join('\n')}

Soluciones que podríamos ofrecer:
${nicheSolutions.soluciones.map(s => `• ${s}`).join('\n')}

Hooks que podrías usar (ejemplos):
${nicheSolutions.hooks.map(h => `• "${h}"`).join('\n')}

═══════════════════════════════════════════════════════════════
TU TAREA
═══════════════════════════════════════════════════════════════

Genera un mensaje de ${channel === 'whatsapp' ? 'WhatsApp' : 'email'} para este prospecto.

TIPO DE MENSAJE: ${template.toUpperCase()}

RECORDÁ:
1. Elegí SOLO 1-2 soluciones relevantes para este negocio específico
2. Empatizá con SU problema, no vendas tu servicio
3. Terminá SIEMPRE proponiendo una llamadita/reunión
4. Máximo 5 líneas para WhatsApp

${customContext ? `Contexto adicional del vendedor: ${customContext}` : ''}

Genera SOLO el mensaje, sin explicaciones ni comentarios.
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
