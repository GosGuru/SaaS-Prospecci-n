# Configuración de WhatsApp con Evolution API

## � Importante

**NO necesitás configurar variables de entorno si ya conectaste WhatsApp en la UI.**

La configuración se guarda automáticamente en la base de datos cuando conectás WhatsApp en:
**Configuración → Canales → WhatsApp → Conectar WhatsApp**

---

## 🚀 Flujo automático (recomendado)

### 1. Conectar WhatsApp en la UI (ya lo hiciste ✅)

1. Ir a **Configuración** → **Canales**
2. Completar los datos de Evolution:
   - URL del servidor: `https://proyectopersonal-evolution-api.titshj.easypanel.host`
   - API Key: Tu API key
   - Nombre de instancia: `Máximo porcile`
3. Click en **"Conectar WhatsApp"**
4. Si la instancia ya está conectada, verás: ✅ **WhatsApp conectado correctamente**

Esto guarda la configuración en la base de datos (`ChannelConfig` table).

### 2. Configurar Webhook en Evolution Manager

1. Abrí Evolution API Manager
2. Andá a tu instancia → **Webhooks**
3. Agregá este webhook:

```
URL: https://tu-dominio.com/api/evolution/webhook
Eventos: ✅ messages.upsert
         ✅ messages.update
         ✅ connection.update
```

### 3. ¡Listo! 🎉

Ahora podés:
- ✅ Enviar mensajes desde el CRM (se lee la config de la DB automáticamente)
- ✅ Recibir mensajes vía webhook
- ✅ Ver todo en el Inbox en tiempo real

## 🔄 Flujo completo

### Enviar mensajes:

1. **Desde Leads**: Ir al perfil del lead → Pestaña "Mensajes" → Escribir y enviar
2. **Desde Inbox**: Seleccionar conversación → Escribir en el campo inferior → Enviar

### Recibir mensajes:

1. Los mensajes entrantes llegan automáticamente vía webhook
2. Aparecen en el **Inbox** en tiempo real
3. Se crea automáticamente el lead si no existe
4. Se registra una actividad en el timeline del lead

## 📊 Estados de mensajes

- **PENDING**: Mensaje en cola
- **SENT**: Enviado al servidor de WhatsApp
- **DELIVERED**: Entregado al destinatario (✓✓)
- **READ**: Leído por el destinatario (✓✓ azul)
- **FAILED**: Error en el envío

## 🐛 Troubleshooting

### Error 500 al enviar mensajes

**Causa**: No se encuentra la configuración de WhatsApp

**Solución**:
1. Verificá que hayas conectado WhatsApp en Configuración
2. Revisá que las variables de entorno estén correctas
3. Asegurate que la instancia de Evolution esté conectada (estado: `open`)

### No recibo mensajes

**Causa**: Webhook no configurado o URL incorrecta

**Solución**:
1. Verificá la URL del webhook en Evolution Manager
2. Debe ser: `https://tu-dominio.com/api/evolution/webhook`
3. Asegurate que los eventos estén marcados
4. Probá enviando un mensaje de prueba desde WhatsApp

### Mensajes duplicados

**Causa**: Webhook configurado múltiples veces

**Solución**:
1. Revisá que solo haya UN webhook configurado en Evolution
2. Eliminá webhooks duplicados

---

## 🔧 Cómo funciona internamente

### Prioridad de configuración:

```
1. 🥇 Base de datos (ChannelConfig)
   ├─ Configurado en: Settings → Canales → WhatsApp
   ├─ Guardado en: tabla `ChannelConfig`
   └─ Se lee automáticamente cuando enviás mensajes

2. 🥈 Variables de entorno (.env.local)
   └─ Solo se usa si NO hay config en la base de datos
```

### Flujo de envío de mensajes:

```javascript
// 1. Usuario envía mensaje desde Inbox o Lead profile
POST /api/whatsapp/send { leadId, message, workspaceId }

// 2. El endpoint busca la configuración
const channelConfig = await prisma.channelConfig.findUnique({
  where: { workspaceId_channel: { workspaceId, channel: 'WHATSAPP' } }
})

// 3. Si encuentra la config en la DB, la usa ✅
if (channelConfig.provider === 'evolution') {
  // Crea cliente con los datos guardados en Settings
  evolutionClient = createEvolutionClient({
    baseUrl: config.baseUrl,      // De la DB
    apiKey: config.apiKey,         // De la DB
    instance: config.instance,     // De la DB
  })
}

// 4. Envía el mensaje a Evolution API
// 5. Evolution envía a WhatsApp
// 6. ✅ Mensaje enviado
```

---

## 📝 Logs útiles

Para debuggear, mirá los logs del servidor:

```bash
# Webhook recibido
[Evolution Webhook] Event received: {...}

# Mensaje procesado
[Evolution Webhook] Processing message: {...}

# Lead creado
[Evolution Webhook] Created new lead: xxx

# Mensaje guardado
[Evolution Webhook] Created inbound message and activity
```

## 🔒 Seguridad

1. **HTTPS obligatorio**: Evolution webhook solo funciona con HTTPS en producción
2. **API Key**: Mantené tu API key segura, usá variables de entorno
3. **Rate limiting**: Evolution API tiene límites, no envíes spam

## 📚 Recursos

- [Documentación Evolution API](https://doc.evolution-api.com)
- [Instalación Evolution con Docker](https://doc.evolution-api.com/pt/get-started/installation/docker)
- [Configuración de Webhooks](https://doc.evolution-api.com/pt/integrations/webhooks)
